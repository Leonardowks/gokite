import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  GraduationCap, 
  Package, 
  Calendar, 
  Repeat,
  Loader2,
  ShoppingCart,
  UserPlus,
  Wallet,
  MessageCircle,
  Box,
  AlertTriangle
} from "lucide-react";
import { useTransacaoAutomatica, getCentroCustoPorOrigem } from "@/hooks/useTransacaoAutomatica";
import { useClientesListagem } from "@/hooks/useSupabaseClientes";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useTaxRulesMap, getTaxRateFromMap } from "@/hooks/useTaxRulesByCategory";
import { useConfigFinanceiro, getTaxaCartao } from "@/hooks/useTransacoes";
import { useProdutosComEstoque, useDeduzirEstoqueVenda } from "@/hooks/useProdutosComEstoque";
import { toast } from "sonner";

interface NovaVendaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type TipoVenda = 'aula' | 'venda_produto' | 'aluguel' | 'trade_in' | 'manual';
type FormaPagamento = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'trade_in';
type CentroCusto = 'Escola' | 'Loja' | 'Administrativo' | 'Pousada';

export function NovaVendaDialog({ open, onOpenChange, onSuccess }: NovaVendaDialogProps) {
  const [tipoVenda, setTipoVenda] = useState<TipoVenda>('manual');
  const [descricao, setDescricao] = useState('');
  const [valorBruto, setValorBruto] = useState('');
  const [custoProduto, setCustoProduto] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [parcelas, setParcelas] = useState('1');
  const [clienteId, setClienteId] = useState('');
  const [centroCusto, setCentroCusto] = useState<CentroCusto>('Escola');
  
  // Seleção de equipamento para venda de produtos
  const [equipamentoId, setEquipamentoId] = useState('');
  const [quantidadeVenda, setQuantidadeVenda] = useState('1');
  
  // Store Credit
  const [usarStoreCredit, setUsarStoreCredit] = useState(false);
  const [notificarStoreCredit, setNotificarStoreCredit] = useState(true);
  
  // Campos para criar cliente novo
  const [criarNovoCliente, setCriarNovoCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteEmail, setNovoClienteEmail] = useState('');
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');

  const { criarTransacaoCompleta, isPending } = useTransacaoAutomatica();
  const { data: clientes = [] } = useClientesListagem();
  const { data: taxRulesMap } = useTaxRulesMap();
  const { data: config } = useConfigFinanceiro();
  const haptic = useHapticFeedback();
  
  // Produtos com estoque
  const { data: produtosEstoque = [] } = useProdutosComEstoque();
  const { mutateAsync: deduzirEstoque, isPending: isDeduzindo } = useDeduzirEstoqueVenda();

  // Cliente selecionado com crédito
  const clienteSelecionado = useMemo(() => {
    if (criarNovoCliente || !clienteId) return null;
    return clientes.find(c => c.id === clienteId) || null;
  }, [clienteId, clientes, criarNovoCliente]);

  const storeCreditDisponivel = clienteSelecionado?.store_credit || 0;
  
  // Equipamento selecionado para venda de produto
  const equipamentoSelecionado = useMemo(() => {
    if (!equipamentoId || equipamentoId === '_none') return null;
    return produtosEstoque.find(p => p.id === equipamentoId) || null;
  }, [equipamentoId, produtosEstoque]);
  
  // Quantidade disponível do equipamento selecionado
  const estoqueDisponivel = equipamentoSelecionado?.quantidade_fisica || 0;
  const qtdVenda = parseInt(quantidadeVenda) || 1;
  const estoqueInsuficiente = equipamentoSelecionado && qtdVenda > estoqueDisponivel;

  // Auto-preencher custo e valor quando selecionar equipamento
  useEffect(() => {
    if (equipamentoSelecionado) {
      if (equipamentoSelecionado.cost_price) {
        setCustoProduto(String(equipamentoSelecionado.cost_price * qtdVenda));
      }
      if (equipamentoSelecionado.sale_price && !valorBruto) {
        setValorBruto(String(equipamentoSelecionado.sale_price * qtdVenda));
      }
      if (!descricao) {
        setDescricao(`Venda: ${equipamentoSelecionado.nome}${equipamentoSelecionado.tamanho ? ` (${equipamentoSelecionado.tamanho})` : ''}`);
      }
    }
  }, [equipamentoSelecionado, qtdVenda]);

  // Reset usar store credit quando mudar cliente
  useEffect(() => {
    if (!clienteSelecionado || storeCreditDisponivel <= 0) {
      setUsarStoreCredit(false);
    }
  }, [clienteSelecionado, storeCreditDisponivel]);

  // Calcular valores com store credit
  const valorOriginal = parseFloat(valorBruto) || 0;
  const storeCreditAplicado = usarStoreCredit 
    ? Math.min(storeCreditDisponivel, valorOriginal) 
    : 0;
  const valorFinal = valorOriginal - storeCreditAplicado;
  const storeCreditRestante = storeCreditDisponivel - storeCreditAplicado;

  // Calculate preview based on tax_rules (usando valor final)
  const previewCalc = useMemo(() => {
    const valor = valorFinal;
    const custo = parseFloat(custoProduto) || 0;
    if (valorOriginal <= 0) return null;

    const categoryRates = getTaxRateFromMap(taxRulesMap, tipoVenda);
    const taxaCartaoPercent = formaPagamento === 'pix' 
      ? (config?.taxa_pix || 0)
      : formaPagamento === 'dinheiro' || formaPagamento === 'trade_in'
        ? 0
        : getTaxaCartao(config?.taxas_cartao, formaPagamento, parseInt(parcelas) || 1);
    
    const taxaImpostoPercent = categoryRates.taxRate;
    const taxaCartao = (valor * taxaCartaoPercent) / 100;
    const imposto = (valor * taxaImpostoPercent) / 100;
    const lucro = valor - custo - taxaCartao - imposto;
    const margem = valorOriginal > 0 ? (lucro / valorOriginal) * 100 : 0;

    return { taxaCartao, imposto, lucro, margem, taxaImpostoPercent };
  }, [valorOriginal, valorFinal, custoProduto, tipoVenda, formaPagamento, parcelas, taxRulesMap, config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar estoque se equipamento selecionado
    if (tipoVenda === 'venda_produto' && equipamentoSelecionado) {
      if (estoqueInsuficiente) {
        toast.error(`Estoque insuficiente! Disponível: ${estoqueDisponivel}`);
        return;
      }
    }

    // Nome do cliente para log de movimentação
    const nomeCliente = criarNovoCliente 
      ? novoClienteNome 
      : clienteSelecionado?.nome || 'cliente avulso';

    // 1. Criar transação financeira
    await criarTransacaoCompleta({
      tipo: 'receita',
      origem: tipoVenda === 'manual' ? 'manual' : tipoVenda as any,
      descricao: storeCreditAplicado > 0 
        ? `${descricao} (R$ ${storeCreditAplicado.toFixed(2)} em crédito de loja)`
        : descricao,
      valor_bruto: valorFinal, // Valor após desconto do crédito
      custo_produto: parseFloat(custoProduto) || 0,
      forma_pagamento: formaPagamento,
      parcelas: parseInt(parcelas) || 1,
      centro_de_custo: centroCusto,
      // Cliente existente ou novo
      cliente_id: !criarNovoCliente && clienteId ? clienteId : undefined,
      cliente: criarNovoCliente && novoClienteNome && novoClienteEmail ? {
        nome: novoClienteNome,
        email: novoClienteEmail,
        telefone: novoClienteTelefone || undefined,
      } : undefined,
      // Store credit a descontar
      store_credit_usado: storeCreditAplicado,
      // Notificar cliente via WhatsApp
      notificar_store_credit: notificarStoreCredit && storeCreditAplicado > 0,
    });
    
    // 2. Deduzir estoque se equipamento selecionado
    if (tipoVenda === 'venda_produto' && equipamentoSelecionado) {
      try {
        const resultado = await deduzirEstoque({
          equipamentoId: equipamentoSelecionado.id,
          quantidade: qtdVenda,
          clienteNome: nomeCliente,
        });
        
        toast.success(
          `Estoque atualizado: ${resultado.nomeEquipamento} → ${resultado.estoqueRestante} un.`,
          { duration: 4000 }
        );
      } catch (error: any) {
        toast.error(`Erro ao deduzir estoque: ${error.message}`);
        // Não bloqueia a transação, já foi registrada
      }
    }
    
    haptic.success();
    
    // Reset form
    setTipoVenda('manual');
    setDescricao('');
    setValorBruto('');
    setCustoProduto('');
    setFormaPagamento('pix');
    setParcelas('1');
    setClienteId('');
    setCentroCusto('Escola');
    setCriarNovoCliente(false);
    setNovoClienteNome('');
    setNovoClienteEmail('');
    setNovoClienteTelefone('');
    setUsarStoreCredit(false);
    setNotificarStoreCredit(true);
    setEquipamentoId('');
    setQuantidadeVenda('1');

    onOpenChange(false);
    onSuccess?.();
  };

  const tiposVenda = [
    { value: 'aula', label: 'Aula', icon: GraduationCap, cor: 'text-blue-500' },
    { value: 'venda_produto', label: 'Produto', icon: Package, cor: 'text-purple-500' },
    { value: 'aluguel', label: 'Aluguel', icon: Calendar, cor: 'text-amber-500' },
    { value: 'trade_in', label: 'Trade-In', icon: Repeat, cor: 'text-emerald-500' },
    { value: 'manual', label: 'Outro', icon: ShoppingCart, cor: 'text-muted-foreground' },
  ];

  // Centro de custo automático baseado no tipo
  const getCentroCustoSugerido = (tipo: TipoVenda): CentroCusto => {
    switch (tipo) {
      case 'aula': return 'Escola';
      case 'venda_produto': 
      case 'trade_in': return 'Loja';
      case 'aluguel': return 'Escola';
      default: return 'Escola';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Nova Venda</DialogTitle>
          <DialogDescription>
            Registre uma nova transação comercial
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto flex-1 pr-1">
          {/* Tipo de Venda - Cards */}
          <div className="space-y-2">
            <Label>Tipo de Venda</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {tiposVenda.map((tipo) => {
                const Icon = tipo.icon;
                const isSelected = tipoVenda === tipo.value;
                return (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => {
                      setTipoVenda(tipo.value as TipoVenda);
                      setCentroCusto(getCentroCustoSugerido(tipo.value as TipoVenda));
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 sm:p-3 min-h-[64px] rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : tipo.cor}`} />
                    <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                      {tipo.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Ex: Aula de kitesurf iniciante, Venda de trapézio Duotone..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Seleção de Equipamento (para venda de produto) */}
          {tipoVenda === 'venda_produto' && (
            <div className="space-y-3 p-3 rounded-lg border border-dashed border-purple-300 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-950/20">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
                <Box className="h-4 w-4" />
                <span>Vincular ao Estoque (Baixa Automática)</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Produto</Label>
                  <Select 
                    value={equipamentoId} 
                    onValueChange={(v) => {
                      setEquipamentoId(v === '_none' ? '' : v);
                      if (v === '_none') {
                        // Limpar campos auto-preenchidos
                        setCustoProduto('');
                      }
                    }}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Selecionar produto do estoque" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sem baixa de estoque</SelectItem>
                      {produtosEstoque.map((produto) => (
                        <SelectItem key={produto.id} value={produto.id}>
                          <div className="flex items-center gap-2">
                            <span>{produto.nome}</span>
                            {produto.tamanho && (
                              <span className="text-xs text-muted-foreground">({produto.tamanho})</span>
                            )}
                            <span className={`text-xs ml-auto ${produto.quantidade_fisica <= 2 ? 'text-destructive' : 'text-success'}`}>
                              {produto.quantidade_fisica} un.
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    max={estoqueDisponivel || 999}
                    value={quantidadeVenda}
                    onChange={(e) => setQuantidadeVenda(e.target.value)}
                    className="min-h-[44px]"
                    disabled={!equipamentoSelecionado}
                  />
                </div>
              </div>
              
              {/* Alerta de estoque */}
              {equipamentoSelecionado && (
                <div className="flex items-center gap-2 text-sm">
                  {estoqueInsuficiente ? (
                    <div className="flex items-center gap-1.5 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Estoque insuficiente! Disponível: {estoqueDisponivel}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-success">
                      <Package className="h-4 w-4" />
                      <span>
                        Após venda: {estoqueDisponivel - qtdVenda} un. restantes
                        {equipamentoSelecionado.sale_price && (
                          <span className="text-muted-foreground ml-2">
                            • Preço sugerido: R$ {(equipamentoSelecionado.sale_price * qtdVenda).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {!equipamentoSelecionado && (
                <p className="text-xs text-muted-foreground">
                  Selecione um produto para deduzir automaticamente do estoque ao registrar a venda
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valorBruto}
                onChange={(e) => setValorBruto(e.target.value)}
                required
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custo">Custo (R$)</Label>
              <Input
                id="custo"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={custoProduto}
                onChange={(e) => setCustoProduto(e.target.value)}
                className="min-h-[44px]"
              />
              <p className="text-xs text-muted-foreground">Para cálculo de margem</p>
            </div>
          </div>

          {/* Forma de Pagamento e Parcelas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={(v) => setFormaPagamento(v as FormaPagamento)}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="trade_in">Trade-In</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formaPagamento === 'cartao_credito' && (
              <div className="space-y-2">
                <Label htmlFor="parcelas">Parcelas</Label>
                <Select value={parcelas} onValueChange={setParcelas}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Cliente */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Cliente</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCriarNovoCliente(!criarNovoCliente)}
                className="gap-1 text-xs h-7"
              >
                <UserPlus className="h-3 w-3" />
                {criarNovoCliente ? 'Selecionar existente' : 'Criar novo'}
              </Button>
            </div>
            
            {criarNovoCliente ? (
              <div className="space-y-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                <Input
                  placeholder="Nome do cliente"
                  value={novoClienteNome}
                  onChange={(e) => setNovoClienteNome(e.target.value)}
                  className="min-h-[44px]"
                />
                <Input
                  type="email"
                  placeholder="Email do cliente"
                  value={novoClienteEmail}
                  onChange={(e) => setNovoClienteEmail(e.target.value)}
                  className="min-h-[44px]"
                />
                <Input
                  placeholder="Telefone (opcional)"
                  value={novoClienteTelefone}
                  onChange={(e) => setNovoClienteTelefone(e.target.value)}
                  className="min-h-[44px]"
                />
                <p className="text-xs text-muted-foreground">
                  ✓ Cliente será criado automaticamente ao registrar a venda
                </p>
              </div>
            ) : (
              <Select value={clienteId} onValueChange={(v) => setClienteId(v === '_none' ? '' : v)}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Selecionar cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      <div className="flex items-center gap-2">
                        {cliente.nome}
                        {(cliente.store_credit || 0) > 0 && (
                          <span className="text-xs text-success font-medium">
                            💰 R$ {cliente.store_credit?.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Store Credit */}
          {!criarNovoCliente && storeCreditDisponivel > 0 && valorOriginal > 0 && (
            <div className="p-4 rounded-lg border-2 border-success/30 bg-success/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-success">Crédito de Loja Disponível</p>
                    <p className="text-sm text-muted-foreground">
                      Saldo: R$ {storeCreditDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={usarStoreCredit}
                  onCheckedChange={setUsarStoreCredit}
                />
              </div>
              
              {usarStoreCredit && (
                <div className="pt-2 border-t border-success/20 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor original:</span>
                    <span>R$ {valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-success">
                    <span>Crédito aplicado:</span>
                    <span>- R$ {storeCreditAplicado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-1">
                    <span>A pagar:</span>
                    <span>R$ {valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {storeCreditRestante > 0 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Saldo restante após venda: R$ {storeCreditRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                  
                  {/* Notificação WhatsApp */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-success/20">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                      <span className="text-xs">Notificar cliente via WhatsApp</span>
                    </div>
                    <Switch
                      checked={notificarStoreCredit}
                      onCheckedChange={setNotificarStoreCredit}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
            
          {/* Centro de Custo */}
          <div className="space-y-2">
            <Label>Centro de Custo</Label>
            <Select value={centroCusto} onValueChange={(v) => setCentroCusto(v as CentroCusto)}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Escola">Escola</SelectItem>
                <SelectItem value="Loja">Loja</SelectItem>
                <SelectItem value="Administrativo">Administrativo</SelectItem>
                <SelectItem value="Pousada">Pousada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resumo de cálculo */}
          {previewCalc && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm font-medium">Resumo estimado:</p>
              <div className="grid grid-cols-2 gap-1 text-sm">
                {storeCreditAplicado > 0 ? (
                  <>
                    <span className="text-muted-foreground">Valor original:</span>
                    <span className="text-right">R$ {valorOriginal.toLocaleString('pt-BR')}</span>
                    <span className="text-success">Crédito aplicado:</span>
                    <span className="text-right text-success">- R$ {storeCreditAplicado.toLocaleString('pt-BR')}</span>
                    <span className="text-muted-foreground font-medium">A receber:</span>
                    <span className="text-right font-medium">R$ {valorFinal.toLocaleString('pt-BR')}</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">Valor bruto:</span>
                    <span className="text-right font-medium">R$ {valorOriginal.toLocaleString('pt-BR')}</span>
                  </>
                )}
                
                {custoProduto && parseFloat(custoProduto) > 0 && (
                  <>
                    <span className="text-muted-foreground">Custo:</span>
                    <span className="text-right text-destructive">- R$ {parseFloat(custoProduto).toLocaleString('pt-BR')}</span>
                  </>
                )}
                
                <span className="text-muted-foreground">Taxa cartão:</span>
                <span className="text-right text-destructive">- R$ {previewCalc.taxaCartao.toFixed(2)}</span>
                
                <span className="text-muted-foreground">Imposto ({previewCalc.taxaImpostoPercent}%):</span>
                <span className="text-right text-destructive">- R$ {previewCalc.imposto.toFixed(2)}</span>
                
                <span className={`font-semibold ${previewCalc.lucro >= 0 ? 'text-success' : 'text-destructive'}`}>Lucro líquido:</span>
                <span className={`text-right font-semibold ${previewCalc.lucro >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {previewCalc.lucro.toFixed(2)} ({previewCalc.margem.toFixed(0)}%)
                </span>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 min-h-[48px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isPending || 
                isDeduzindo || 
                !valorBruto || 
                (criarNovoCliente && (!novoClienteNome || !novoClienteEmail)) ||
                (tipoVenda === 'venda_produto' && equipamentoSelecionado && estoqueInsuficiente)
              }
              className="flex-1 gap-2 min-h-[48px]"
            >
              {isPending || isDeduzindo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {storeCreditAplicado > 0 
                ? `Registrar (R$ ${valorFinal.toFixed(2)})` 
                : equipamentoSelecionado 
                  ? 'Registrar + Baixar Estoque'
                  : 'Registrar Venda'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
