import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wallet, 
  RefreshCw, 
  Clock, 
  DollarSign, 
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Minus,
  Loader2,
  Gift
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumCard } from "@/components/ui/premium-card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface StoreCreditCardProps {
  clienteId: string;
  storeCredit: number;
  className?: string;
}

interface TradeInHistorico {
  id: string;
  equipamento_recebido: string;
  valor_entrada: number;
  valor_saida: number | null;
  data_entrada: string;
  data_saida: string | null;
  status: string;
  lucro_trade_in: number | null;
}

type TipoAjuste = 'adicionar' | 'remover';

export function StoreCreditCard({ clienteId, storeCredit, className }: StoreCreditCardProps) {
  const [ajusteDialogOpen, setAjusteDialogOpen] = useState(false);
  const [tipoAjuste, setTipoAjuste] = useState<TipoAjuste>('adicionar');
  const [valorAjuste, setValorAjuste] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar trade-ins onde o cliente foi o fornecedor (deu o equipamento)
  const { data: tradeInsRecebidos = [], isLoading: loadingRecebidos } = useQuery({
    queryKey: ["trade-ins-cliente-recebidos", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transacoes")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("origem", "trade_in")
        .eq("tipo", "despesa")
        .order("data_transacao", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId,
  });

  // Buscar compras onde cliente usou crédito (vendas de trade-in para este cliente)
  const { data: tradeInsComprados = [], isLoading: loadingCompras } = useQuery({
    queryKey: ["trade-ins-cliente-compras", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_ins")
        .select("*")
        .eq("comprador_id", clienteId)
        .order("data_saida", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as TradeInHistorico[];
    },
    enabled: !!clienteId,
  });

  // Buscar ajustes manuais de crédito
  const { data: ajustesManuais = [] } = useQuery({
    queryKey: ["ajustes-credito-cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transacoes")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("origem", "manual")
        .ilike("descricao", "%crédito de loja%")
        .order("data_transacao", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId,
  });

  // Mutation para ajustar crédito
  const ajustarCreditoMutation = useMutation({
    mutationFn: async ({ valor, tipo, motivo }: { valor: number; tipo: TipoAjuste; motivo: string }) => {
      // 1. Buscar saldo atual
      const { data: cliente, error: erroCliente } = await supabase
        .from("clientes")
        .select("store_credit")
        .eq("id", clienteId)
        .single();

      if (erroCliente) throw erroCliente;

      const saldoAtual = cliente?.store_credit || 0;
      const novoSaldo = tipo === 'adicionar' 
        ? saldoAtual + valor 
        : Math.max(0, saldoAtual - valor);

      // 2. Atualizar saldo do cliente
      const { error: erroUpdate } = await supabase
        .from("clientes")
        .update({ store_credit: novoSaldo })
        .eq("id", clienteId);

      if (erroUpdate) throw erroUpdate;

      // 3. Registrar transação para histórico
      const { error: erroTransacao } = await supabase
        .from("transacoes")
        .insert({
          tipo: tipo === 'adicionar' ? 'despesa' : 'receita',
          origem: 'manual',
          descricao: `Ajuste de crédito de loja: ${motivo}`,
          valor_bruto: valor,
          forma_pagamento: 'dinheiro',
          centro_de_custo: 'Administrativo',
          cliente_id: clienteId,
        });

      if (erroTransacao) throw erroTransacao;

      return { novoSaldo, tipo };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["clientes-listagem"] });
      queryClient.invalidateQueries({ queryKey: ["ajustes-credito-cliente", clienteId] });
      
      toast({
        title: result.tipo === 'adicionar' ? "✅ Crédito adicionado!" : "✅ Crédito removido!",
        description: `Novo saldo: R$ ${result.novoSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      });
      
      setAjusteDialogOpen(false);
      setValorAjuste('');
      setMotivoAjuste('');
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao ajustar crédito",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAjustarCredito = () => {
    const valor = parseFloat(valorAjuste);
    if (!valor || valor <= 0 || !motivoAjuste.trim()) {
      toast({
        title: "Dados inválidos",
        description: "Preencha o valor e o motivo do ajuste",
        variant: "destructive",
      });
      return;
    }

    ajustarCreditoMutation.mutate({ valor, tipo: tipoAjuste, motivo: motivoAjuste });
  };

  const isLoading = loadingRecebidos || loadingCompras;

  // Calcular totais
  const totalCreditoRecebido = tradeInsRecebidos.reduce((acc, t) => acc + (t.valor_bruto || 0), 0);
  const totalCreditoUsado = tradeInsComprados.reduce((acc, t) => acc + (t.valor_saida || 0), 0);

  // Histórico combinado
  const historico = [
    ...tradeInsRecebidos.map(t => ({
      id: t.id,
      tipo: 'entrada' as const,
      descricao: t.descricao || 'Trade-in recebido',
      valor: t.valor_bruto,
      data: t.data_transacao,
    })),
    ...tradeInsComprados.map(t => ({
      id: t.id,
      tipo: 'saida' as const,
      descricao: `Compra: ${t.equipamento_recebido}`,
      valor: t.valor_saida || 0,
      data: t.data_saida || t.data_entrada,
    })),
    ...ajustesManuais.map(t => ({
      id: t.id,
      tipo: t.tipo === 'despesa' ? 'entrada' as const : 'saida' as const,
      descricao: t.descricao || 'Ajuste manual',
      valor: t.valor_bruto,
      data: t.data_transacao,
    })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <>
      <PremiumCard className={cn("border-primary/20 bg-gradient-to-br from-primary/5 to-transparent", className)}>
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-display">Crédito de Loja</CardTitle>
                <p className="text-sm text-muted-foreground">Saldo disponível para compras</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAjusteDialogOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Ajustar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
          {/* Saldo Atual */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Disponível</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-primary">R$</span>
                <AnimatedNumber
                  value={storeCredit}
                  className="text-3xl font-bold text-primary"
                />
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-xl bg-success/10">
              <ArrowDownCircle className="h-5 w-5 mx-auto text-success mb-1" />
              <p className="text-lg font-bold text-success">
                R$ {totalCreditoRecebido.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground">Trade-ins realizados</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-warning/10">
              <ArrowUpCircle className="h-5 w-5 mx-auto text-warning mb-1" />
              <p className="text-lg font-bold text-warning">
                R$ {totalCreditoUsado.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground">Crédito utilizado</p>
            </div>
          </div>

          {/* Histórico */}
          {historico.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Histórico de Movimentações
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {historico.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          item.tipo === 'entrada' ? 'bg-success/10' : 'bg-warning/10'
                        )}>
                          {item.tipo === 'entrada' ? (
                            <ArrowDownCircle className="h-4 w-4 text-success" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.data), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "text-sm font-bold",
                        item.tipo === 'entrada' ? 'text-success' : 'text-warning'
                      )}>
                        {item.tipo === 'entrada' ? '+' : '-'} R$ {item.valor.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Trade-ins comprados */}
          {tradeInsComprados.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Equipamentos Adquiridos
                </h4>
                <div className="space-y-2">
                  {tradeInsComprados.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <RefreshCw className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.equipamento_recebido}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.data_saida 
                              ? format(new Date(item.data_saida), "dd/MM/yyyy", { locale: ptBR })
                              : 'Data não informada'
                            }
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-primary">
                        R$ {(item.valor_saida || 0).toLocaleString('pt-BR')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {historico.length === 0 && !isLoading && (
            <div className="text-center py-6 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma movimentação de crédito</p>
              <p className="text-xs mt-1">Trade-ins realizados aparecerão aqui</p>
            </div>
          )}
        </CardContent>
      </PremiumCard>

      {/* Dialog de Ajuste */}
      <Dialog open={ajusteDialogOpen} onOpenChange={setAjusteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Ajustar Crédito de Loja
            </DialogTitle>
            <DialogDescription>
              Adicione ou remova crédito manualmente como cortesia ou ajuste
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Tipo de Ajuste */}
            <div className="space-y-2">
              <Label>Tipo de Ajuste</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipoAjuste === 'adicionar' ? 'default' : 'outline'}
                  onClick={() => setTipoAjuste('adicionar')}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
                <Button
                  type="button"
                  variant={tipoAjuste === 'remover' ? 'destructive' : 'outline'}
                  onClick={() => setTipoAjuste('remover')}
                  className="gap-2"
                >
                  <Minus className="h-4 w-4" />
                  Remover
                </Button>
              </div>
            </div>

            {/* Saldo Atual */}
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">Saldo Atual</p>
              <p className="text-xl font-bold text-primary">
                R$ {storeCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label htmlFor="valor-ajuste">Valor (R$)</Label>
              <Input
                id="valor-ajuste"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valorAjuste}
                onChange={(e) => setValorAjuste(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="motivo-ajuste">Motivo</Label>
              <Select value={motivoAjuste} onValueChange={setMotivoAjuste}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cortesia">🎁 Cortesia</SelectItem>
                  <SelectItem value="Ajuste de saldo">⚖️ Ajuste de saldo</SelectItem>
                  <SelectItem value="Compensação">🔄 Compensação</SelectItem>
                  <SelectItem value="Promoção">🎉 Promoção</SelectItem>
                  <SelectItem value="Erro no sistema">⚠️ Correção de erro</SelectItem>
                  <SelectItem value="Bonificação">⭐ Bonificação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {valorAjuste && parseFloat(valorAjuste) > 0 && (
              <div className={cn(
                "p-3 rounded-lg text-center",
                tipoAjuste === 'adicionar' ? 'bg-success/10' : 'bg-destructive/10'
              )}>
                <p className="text-xs text-muted-foreground">Novo Saldo</p>
                <p className={cn(
                  "text-xl font-bold",
                  tipoAjuste === 'adicionar' ? 'text-success' : 'text-destructive'
                )}>
                  R$ {(
                    tipoAjuste === 'adicionar'
                      ? storeCredit + parseFloat(valorAjuste)
                      : Math.max(0, storeCredit - parseFloat(valorAjuste))
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAjusteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAjustarCredito}
              disabled={ajustarCreditoMutation.isPending || !valorAjuste || !motivoAjuste}
              className="gap-2"
            >
              {ajustarCreditoMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : tipoAjuste === 'adicionar' ? (
                <Plus className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              {tipoAjuste === 'adicionar' ? 'Adicionar Crédito' : 'Remover Crédito'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
