import { useState } from "react";
import { DollarSign, Search, Loader2, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useVenderTradeIn, TradeIn } from "@/hooks/useTradeIns";

interface VenderTradeInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeIn: TradeIn;
}

interface ClienteOption {
  id: string;
  nome: string;
  telefone: string | null;
}

export function VenderTradeInDialog({ open, onOpenChange, tradeIn }: VenderTradeInDialogProps) {
  const { toast } = useToast();
  const venderTradeIn = useVenderTradeIn();

  const [busca, setBusca] = useState("");
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteOption | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [valorVenda, setValorVenda] = useState(
    (tradeIn.valor_entrada * 1.3).toFixed(2) // Sugestão: 30% de margem
  );

  const valorVendaNum = parseFloat(valorVenda.replace(",", ".")) || 0;
  const lucroEstimado = valorVendaNum - tradeIn.valor_entrada;
  const margemEstimada = valorVendaNum > 0 ? (lucroEstimado / valorVendaNum) * 100 : 0;

  const buscarClientes = async (termo: string) => {
    if (termo.length < 2) {
      setClientes([]);
      return;
    }
    
    setBuscando(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, telefone")
        .or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%`)
        .limit(5);
      
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setBuscando(false);
    }
  };

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBusca(valor);
    buscarClientes(valor);
  };

  const selecionarCliente = (cliente: ClienteOption) => {
    setClienteSelecionado(cliente);
    setBusca(cliente.nome);
    setClientes([]);
  };

  const handleVender = async () => {
    if (valorVendaNum <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor de venda maior que zero.",
        variant: "destructive",
      });
      return;
    }

    try {
      await venderTradeIn.mutateAsync({
        id: tradeIn.id,
        valor_saida: valorVendaNum,
        comprador_id: clienteSelecionado?.id,
      });

      toast({
        title: "✅ Venda registrada!",
        description: `${tradeIn.equipamento_recebido} vendido por R$ ${valorVendaNum.toFixed(2)}`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao registrar venda",
        description: "Não foi possível processar a venda. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Vender Trade-in
          </DialogTitle>
          <DialogDescription>
            {tradeIn.equipamento_recebido}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info do item */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor de entrada:</span>
              <span className="font-medium">
                R$ {tradeIn.valor_entrada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Busca de Cliente */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Comprador (opcional)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={busca}
                onChange={handleBuscaChange}
                className="pl-10 min-h-[48px]"
              />
              {buscando && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
            </div>
            
            {clientes.length > 0 && (
              <div className="border rounded-lg divide-y bg-background shadow-lg max-h-40 overflow-y-auto">
                {clientes.map((cliente) => (
                  <button
                    key={cliente.id}
                    onClick={() => selecionarCliente(cliente)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium">{cliente.nome}</p>
                    {cliente.telefone && (
                      <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {clienteSelecionado && (
              <div className="flex items-center gap-2 p-2 bg-success/10 border border-success/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">{clienteSelecionado.nome}</span>
              </div>
            )}
          </div>

          {/* Valor de Venda */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Valor de Venda</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <Input
                type="text"
                inputMode="decimal"
                value={valorVenda}
                onChange={(e) => setValorVenda(e.target.value)}
                className="pl-10 min-h-[48px] text-lg font-semibold"
              />
            </div>
          </div>

          {/* Preview de Lucro */}
          <div className={`p-4 rounded-lg border-2 ${lucroEstimado >= 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Lucro Estimado</span>
              <div className="flex items-center gap-1">
                {lucroEstimado >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className={`text-xl font-bold ${lucroEstimado >= 0 ? "text-success" : "text-destructive"}`}>
                  R$ {lucroEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Margem</span>
              <span className={lucroEstimado >= 0 ? "text-success" : "text-destructive"}>
                {margemEstimada.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-3 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[48px]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleVender}
            disabled={venderTradeIn.isPending || valorVendaNum <= 0}
            className="gap-2 w-full sm:w-auto min-h-[48px]"
          >
            {venderTradeIn.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirmar Venda
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
