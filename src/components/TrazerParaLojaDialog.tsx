import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store, Truck, MapPin, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrazerParaLojaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento: {
    id: string;
    nome: string;
    cost_price?: number | null;
    sale_price?: number | null;
  } | null;
}

const localizacoes = [
  { value: "Florianópolis", label: "Florianópolis", icon: "🏖️" },
  { value: "Taíba", label: "Taíba", icon: "🌴" },
];

export function TrazerParaLojaDialog({
  open,
  onOpenChange,
  equipamento,
}: TrazerParaLojaDialogProps) {
  const [localizacao, setLocalizacao] = useState<string>("");
  const queryClient = useQueryClient();

  const convertMutation = useMutation({
    mutationFn: async ({
      equipamentoId,
      novaLocalizacao,
    }: {
      equipamentoId: string;
      novaLocalizacao: string;
    }) => {
      const { data, error } = await supabase
        .from("equipamentos")
        .update({
          source_type: "owned",
          localizacao: novaLocalizacao,
          status: "disponivel",
        })
        .eq("id", equipamentoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: ["equipamentos-listagem"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-stats"] });
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>
            <strong>{data.nome}</strong> agora está na loja{" "}
            <strong>{data.localizacao}</strong>!
          </span>
        </div>
      );
      onOpenChange(false);
      setLocalizacao("");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao converter: ${error.message}`);
    },
  });

  const handleConfirm = () => {
    if (!equipamento || !localizacao) {
      toast.error("Selecione uma localização");
      return;
    }

    convertMutation.mutate({
      equipamentoId: equipamento.id,
      novaLocalizacao: localizacao,
    });
  };

  const formatPrice = (value: number | null | undefined) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Trazer para Loja
          </DialogTitle>
          <DialogDescription>
            O pedido do fornecedor chegou? Converta este produto virtual em
            estoque físico.
          </DialogDescription>
        </DialogHeader>

        {equipamento && (
          <div className="space-y-4">
            {/* Produto Info */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{equipamento.nome}</p>
                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                    <span>Custo: {formatPrice(equipamento.cost_price)}</span>
                    <span>Venda: {formatPrice(equipamento.sale_price)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Localização */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Onde o produto vai ficar?
              </Label>
              <Select value={localizacao} onValueChange={setLocalizacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a localização..." />
                </SelectTrigger>
                <SelectContent>
                  {localizacoes.map((loc) => (
                    <SelectItem key={loc.value} value={loc.value}>
                      <span className="flex items-center gap-2">
                        <span>{loc.icon}</span>
                        <span>{loc.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p>
                ✨ O produto será movido de <strong>"Sob Encomenda"</strong> para{" "}
                <strong>"Minha Loja"</strong> e ficará disponível para venda
                imediata ou aluguel.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!localizacao || convertMutation.isPending}
            className="gap-2"
          >
            {convertMutation.isPending ? (
              "Convertendo..."
            ) : (
              <>
                <Store className="h-4 w-4" />
                Confirmar Recebimento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
