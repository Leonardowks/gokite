import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link2, Search, Loader2, Package, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVincularEan } from "@/hooks/useReceberMercadoria";
import { cn } from "@/lib/utils";

interface VincularEanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ean: string;
  onSuccess: () => void;
}

export function VincularEanDialog({
  open,
  onOpenChange,
  ean,
  onSuccess,
}: VincularEanDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { mutate: vincular, isPending } = useVincularEan();

  // Fetch equipment without EAN
  const { data: equipamentos, isLoading } = useQuery({
    queryKey: ["equipamentos-sem-ean", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("equipamentos")
        .select("id, nome, tipo, tamanho, ean, cost_price, sale_price")
        .is("ean", null)
        .order("nome");

      if (searchTerm.length >= 2) {
        query = query.ilike("nome", `%${searchTerm}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleVincular = () => {
    if (!selectedId) return;

    vincular(
      { equipamentoId: selectedId, ean },
      {
        onSuccess: () => {
          setSelectedId(null);
          setSearchTerm("");
          onSuccess();
          onOpenChange(false);
        },
      }
    );
  };

  const selectedEquipamento = equipamentos?.find((e) => e.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Link2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Vincular EAN a Produto Existente</DialogTitle>
              <DialogDescription>
                Vincular código <span className="font-mono font-medium">{ean}</span> a um produto do estoque
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto por nome..."
              className="pl-9"
            />
          </div>

          {/* Equipment List */}
          <ScrollArea className="h-[280px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : equipamentos && equipamentos.length > 0 ? (
              <div className="p-2 space-y-1">
                {equipamentos.map((equip) => (
                  <button
                    key={equip.id}
                    type="button"
                    onClick={() => setSelectedId(equip.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      selectedId === equip.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "hover:bg-muted/50 border-2 border-transparent"
                    )}
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{equip.nome}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{equip.tipo}</span>
                        {equip.tamanho && (
                          <>
                            <span>•</span>
                            <span>{equip.tamanho}</span>
                          </>
                        )}
                        {equip.sale_price && (
                          <>
                            <span>•</span>
                            <span>R$ {equip.sale_price.toLocaleString("pt-BR")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {selectedId === equip.id && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Package className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm
                    ? "Nenhum produto encontrado"
                    : "Nenhum produto sem EAN cadastrado"}
                </p>
              </div>
            )}
          </ScrollArea>

          {/* Selected Info */}
          {selectedEquipamento && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Selecionado
                </Badge>
                <span className="font-medium">{selectedEquipamento.nome}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                O código EAN será vinculado a este produto
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleVincular} disabled={isPending || !selectedId}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vinculando...
              </>
            ) : (
              "Vincular EAN"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
