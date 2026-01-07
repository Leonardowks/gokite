import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  DollarSign, 
  CreditCard, 
  Landmark, 
  Package, 
  TrendingUp, 
  TrendingDown,
  ArrowDown,
  Wallet,
  Building2
} from "lucide-react";
import { Transacao } from "@/hooks/useTransacoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransacaoDetalheDialogProps {
  transacao: Transacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransacaoDetalheDialog({ transacao, open, onOpenChange }: TransacaoDetalheDialogProps) {
  if (!transacao) return null;

  const isReceita = transacao.tipo === 'receita';
  const margem = transacao.valor_bruto > 0 
    ? (transacao.lucro_liquido / transacao.valor_bruto) * 100 
    : 0;
  const totalDeducoes = transacao.custo_produto + transacao.taxa_cartao_estimada + transacao.imposto_provisionado;

  const formatCurrency = (value: number) => {
    return `R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getFormaPagamentoLabel = (forma: string) => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
      dinheiro: 'Dinheiro',
      trade_in: 'Trade-in',
    };
    return labels[forma] || forma;
  };

  const getOrigemIcon = (origem: string) => {
    switch (origem) {
      case 'venda_equipamento': return Package;
      case 'aula': return TrendingUp;
      case 'aluguel': return Building2;
      default: return DollarSign;
    }
  };

  const OrigemIcon = getOrigemIcon(transacao.origem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isReceita ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              <OrigemIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isReceita ? 'Venda' : 'Despesa'}: {transacao.descricao || transacao.origem}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {format(new Date(transacao.data_transacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Valor Bruto */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Valor Bruto</span>
            </div>
            <span className="text-lg font-bold">{formatCurrency(transacao.valor_bruto)}</span>
          </div>

          {/* Forma de Pagamento */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{getFormaPagamentoLabel(transacao.forma_pagamento)}</span>
            </div>
            {transacao.parcelas > 1 && (
              <Badge variant="secondary">{transacao.parcelas}x</Badge>
            )}
          </div>

          <Separator />

          {/* Deduções */}
          {isReceita && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDown className="h-4 w-4" />
                Deduções
              </h4>

              {transacao.custo_produto > 0 && (
                <div className="flex items-center justify-between pl-6">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Custo do Produto</span>
                  </div>
                  <span className="text-sm text-destructive">-{formatCurrency(transacao.custo_produto)}</span>
                </div>
              )}

              {transacao.taxa_cartao_estimada > 0 && (
                <div className="flex items-center justify-between pl-6">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Taxa Cartão</span>
                  </div>
                  <span className="text-sm text-destructive">-{formatCurrency(transacao.taxa_cartao_estimada)}</span>
                </div>
              )}

              {transacao.imposto_provisionado > 0 && (
                <div className="flex items-center justify-between pl-6">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Imposto Provisionado</span>
                  </div>
                  <span className="text-sm text-destructive">-{formatCurrency(transacao.imposto_provisionado)}</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Lucro Líquido */}
          <div className={`p-4 rounded-xl ${transacao.lucro_liquido >= 0 ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {transacao.lucro_liquido >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-success" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
                <span className="font-semibold">LUCRO LÍQUIDO</span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${transacao.lucro_liquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(transacao.lucro_liquido)}
                </span>
                {isReceita && (
                  <p className="text-xs text-muted-foreground">{margem.toFixed(1)}% margem</p>
                )}
              </div>
            </div>
          </div>

          {/* Breakdown Governo vs Seu */}
          {isReceita && totalDeducoes > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-success/5 border border-success/20 text-center">
                <Wallet className="h-5 w-5 text-success mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Dinheiro seu</p>
                <p className="text-lg sm:text-xl font-bold text-success">{formatCurrency(transacao.lucro_liquido)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                <Landmark className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Governo/Banco</p>
                <p className="text-lg sm:text-xl font-bold text-muted-foreground">
                  {formatCurrency(transacao.taxa_cartao_estimada + transacao.imposto_provisionado)}
                </p>
              </div>
            </div>
          )}

          {/* Centro de Custo */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">Centro de Custo</span>
            <Badge variant="outline">{transacao.centro_de_custo}</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
