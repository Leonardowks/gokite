import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2,
  ShoppingCart,
  Package,
  Check
} from "lucide-react";
import { useTransacaoAutomatica } from "@/hooks/useTransacaoAutomatica";
import { useClientesListagem } from "@/hooks/useSupabaseClientes";
import { toast } from "sonner";

interface VendaRapidaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento: {
    id: string;
    nome: string;
    sale_price?: number | null;
    cost_price?: number | null;
    tamanho?: string | null;
  } | null;
  quantidade: number;
  onSuccess?: () => void;
}

type FormaPagamento = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';

export function VendaRapidaDialog({ 
  open, 
  onOpenChange, 
  equipamento, 
  quantidade,
  onSuccess 
}: VendaRapidaDialogProps) {
  const [valorVenda, setValorVenda] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [clienteId, setClienteId] = useState('');

  const { criarTransacaoCompleta, isPending } = useTransacaoAutomatica();
  const { data: clientes = [] } = useClientesListagem();

  // Pre-fill value when equipamento changes
  useEffect(() => {
    if (equipamento?.sale_price) {
      setValorVenda(String(equipamento.sale_price * quantidade));
    } else {
      setValorVenda('');
    }
    setFormaPagamento('pix');
    setClienteId('');
  }, [equipamento, quantidade, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!equipamento) return;

    const valor = parseFloat(valorVenda) || 0;
    if (valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    const clienteSelecionado = clientes.find(c => c.id === clienteId);
    const descricao = `Venda: ${equipamento.nome}${equipamento.tamanho ? ` (${equipamento.tamanho})` : ''}${quantidade > 1 ? ` x${quantidade}` : ''}`;

    try {
      await criarTransacaoCompleta({
        tipo: 'receita',
        origem: 'venda_produto',
        descricao,
        valor_bruto: valor,
        custo_produto: (equipamento.cost_price || 0) * quantidade,
        forma_pagamento: formaPagamento,
        parcelas: 1,
        centro_de_custo: 'Loja',
        cliente_id: clienteId || undefined,
        equipamento_id: equipamento.id,
      });

      toast.success(
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <div>
            <p className="font-medium">Venda registrada!</p>
            <p className="text-sm text-muted-foreground">
              R$ {valor.toLocaleString('pt-BR')} • {formaPagamento.toUpperCase()}
            </p>
          </div>
        </div>,
        { duration: 4000 }
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Erro ao registrar venda: ${error.message}`);
    }
  };

  const handleSkip = () => {
    toast.info("Saída registrada sem transação financeira");
    onOpenChange(false);
    onSuccess?.();
  };

  if (!equipamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Registrar Venda
          </DialogTitle>
          <DialogDescription>
            Complete os dados da venda para registrar a transação financeira
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Produto Info */}
          <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
            <Package className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{equipamento.nome}</p>
              <p className="text-sm text-muted-foreground">
                {equipamento.tamanho && `${equipamento.tamanho} • `}
                Qtd: {quantidade}
              </p>
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="valor">Valor da Venda (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valorVenda}
              onChange={(e) => setValorVenda(e.target.value)}
              required
              className="min-h-[44px] text-lg font-medium"
              autoFocus
            />
            {equipamento.sale_price && (
              <p className="text-xs text-muted-foreground">
                Preço sugerido: R$ {(equipamento.sale_price * quantidade).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          {/* Forma de Pagamento */}
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
              </SelectContent>
            </Select>
          </div>

          {/* Cliente (opcional) */}
          <div className="space-y-2">
            <Label>Cliente (opcional)</Label>
            <Select value={clienteId} onValueChange={(v) => setClienteId(v === '_none' ? '' : v)}>
              <SelectTrigger className="min-h-[44px]">
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

          {/* Botões */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="submit"
              disabled={isPending || !valorVenda}
              className="w-full gap-2 min-h-[48px]"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Registrar Venda
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              className="w-full text-muted-foreground"
            >
              Pular (sem transação financeira)
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
