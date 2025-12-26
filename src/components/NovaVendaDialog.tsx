import { useState } from "react";
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
  ShoppingCart
} from "lucide-react";
import { useCreateTransacao, type TransacaoInsert } from "@/hooks/useTransacoes";
import { useClientesListagem } from "@/hooks/useSupabaseClientes";

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

  const createMutation = useCreateTransacao();
  const { data: clientes = [] } = useClientesListagem();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const transacao: TransacaoInsert = {
      tipo: 'receita',
      origem: tipoVenda,
      descricao,
      valor_bruto: parseFloat(valorBruto) || 0,
      custo_produto: parseFloat(custoProduto) || 0,
      forma_pagamento: formaPagamento,
      parcelas: parseInt(parcelas) || 1,
      cliente_id: clienteId || undefined,
      centro_de_custo: centroCusto,
    };

    await createMutation.mutateAsync(transacao);
    
    // Reset form
    setTipoVenda('manual');
    setDescricao('');
    setValorBruto('');
    setCustoProduto('');
    setFormaPagamento('pix');
    setParcelas('1');
    setClienteId('');
    setCentroCusto('Escola');

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Nova Venda</DialogTitle>
          <DialogDescription>
            Registre uma nova transação comercial
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tipo de Venda - Cards */}
          <div className="space-y-2">
            <Label>Tipo de Venda</Label>
            <div className="grid grid-cols-5 gap-2">
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
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
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

          {/* Valor e Custo */}
          <div className="grid grid-cols-2 gap-4">
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
              />
              <p className="text-xs text-muted-foreground">Para cálculo de margem</p>
            </div>
          </div>

          {/* Forma de Pagamento e Parcelas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={(v) => setFormaPagamento(v as FormaPagamento)}>
                <SelectTrigger>
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
                  <SelectTrigger>
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

          {/* Cliente e Centro de Custo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              <Select value={clienteId} onValueChange={(v) => setClienteId(v === '_none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <Select value={centroCusto} onValueChange={(v) => setCentroCusto(v as CentroCusto)}>
                <SelectTrigger>
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
          </div>

          {/* Resumo de cálculo */}
          {valorBruto && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm font-medium">Resumo estimado:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Valor bruto:</span>
                <span className="text-right font-medium">R$ {parseFloat(valorBruto || '0').toLocaleString('pt-BR')}</span>
                
                {custoProduto && (
                  <>
                    <span className="text-muted-foreground">Custo:</span>
                    <span className="text-right text-destructive">- R$ {parseFloat(custoProduto).toLocaleString('pt-BR')}</span>
                  </>
                )}
                
                <span className="text-muted-foreground">Taxas + Impostos:</span>
                <span className="text-right text-muted-foreground">Calculado automaticamente</span>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !valorBruto}
              className="flex-1 gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              Registrar Venda
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
