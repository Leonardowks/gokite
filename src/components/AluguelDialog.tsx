import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Package, User, Calendar, DollarSign } from "lucide-react";
import { useEquipamentosDisponiveis } from "@/hooks/useSupabaseEquipamentos";
import { useClientesListagem } from "@/hooks/useSupabaseClientes";
import { format, addDays, differenceInDays } from "date-fns";

interface AluguelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    cliente_id: string;
    equipamento_id: string;
    data_inicio: string;
    data_fim: string;
    valor: number;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function AluguelDialog({ open, onOpenChange, onSave, isLoading }: AluguelDialogProps) {
  const [clienteId, setClienteId] = useState("");
  const [equipamentoId, setEquipamentoId] = useState("");
  const [dataInicio, setDataInicio] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [valorCalculado, setValorCalculado] = useState(0);

  const { data: equipamentos = [], isLoading: loadingEquip } = useEquipamentosDisponiveis();
  const { data: clientes = [], isLoading: loadingClientes } = useClientesListagem("");

  // Calcular valor automaticamente
  useEffect(() => {
    if (equipamentoId && dataInicio && dataFim) {
      const equip = equipamentos.find(e => e.id === equipamentoId);
      if (equip) {
        const dias = Math.max(1, differenceInDays(new Date(dataFim), new Date(dataInicio)));
        setValorCalculado(dias * equip.preco_aluguel_dia);
      }
    }
  }, [equipamentoId, dataInicio, dataFim, equipamentos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !equipamentoId) return;

    await onSave({
      cliente_id: clienteId,
      equipamento_id: equipamentoId,
      data_inicio: dataInicio,
      data_fim: dataFim,
      valor: valorCalculado,
    });

    // Reset form
    setClienteId("");
    setEquipamentoId("");
    setDataInicio(format(new Date(), "yyyy-MM-dd"));
    setDataFim(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  };

  const selectedEquip = equipamentos.find(e => e.id === equipamentoId);
  const dias = Math.max(1, differenceInDays(new Date(dataFim), new Date(dataInicio)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            Novo Aluguel
          </DialogTitle>
          <DialogDescription>
            Registre um novo aluguel de equipamento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Cliente
            </Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder={loadingClientes ? "Carregando..." : "Selecione o cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(cliente => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipamento */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Equipamento Disponível
            </Label>
            <Select value={equipamentoId} onValueChange={setEquipamentoId}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder={loadingEquip ? "Carregando..." : "Selecione o equipamento"} />
              </SelectTrigger>
              <SelectContent>
                {equipamentos.map(equip => (
                  <SelectItem key={equip.id} value={equip.id}>
                    {equip.nome} - {equip.tipo} {equip.tamanho && `(${equip.tamanho})`} - R$ {equip.preco_aluguel_dia}/dia
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Data Início
              </Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Data Fim
              </Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                min={dataInicio}
                className="min-h-[44px]"
              />
            </div>
          </div>

          {/* Resumo do Valor */}
          {selectedEquip && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Resumo do Aluguel
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Equipamento:</span>
                  <span className="font-medium">{selectedEquip.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diária:</span>
                  <span className="font-medium">R$ {selectedEquip.preco_aluguel_dia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Período:</span>
                  <span className="font-medium">{dias} dia(s)</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/50">
                  <span className="font-medium">Total:</span>
                  <span className="text-lg font-bold text-primary">R$ {valorCalculado}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 min-h-[44px]"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 min-h-[44px]"
              disabled={isLoading || !clienteId || !equipamentoId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Confirmar Aluguel"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
