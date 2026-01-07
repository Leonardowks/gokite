import { AlertTriangle, CheckCircle2, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SessaoContagem } from "@/hooks/useInventario";

interface DivergenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessao: SessaoContagem | null;
  onAplicarAjustes: () => void;
}

export function DivergenciaDialog({
  open,
  onOpenChange,
  sessao,
  onAplicarAjustes,
}: DivergenciaDialogProps) {
  if (!sessao) return null;

  const divergencias = sessao.itensConferidos.filter(i => i.divergencia !== 0);
  const totalDivergencias = divergencias.length;
  const sobras = divergencias.filter(i => i.divergencia > 0);
  const faltas = divergencias.filter(i => i.divergencia < 0);

  const exportarRelatorio = () => {
    const headers = ['Nome', 'EAN', 'Sistema', 'Contado', 'Divergência'];
    const rows = divergencias.map(item => [
      item.nome,
      item.ean || '',
      item.quantidadeSistema,
      item.quantidadeContada,
      item.divergencia,
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `divergencias_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Relatório de Divergências
          </DialogTitle>
          <DialogDescription>
            {totalDivergencias === 0
              ? 'Nenhuma divergência encontrada! Estoque confere com o sistema.'
              : `Foram encontradas ${totalDivergencias} divergências na contagem.`}
          </DialogDescription>
        </DialogHeader>

        {totalDivergencias === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-success mb-4" />
            <p className="text-lg font-medium text-success">Tudo certo!</p>
            <p className="text-muted-foreground">
              A contagem física confere com o sistema.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-success">Sobras</span>
                </div>
                <p className="text-2xl font-bold">{sobras.length}</p>
                <p className="text-xs text-muted-foreground">
                  Itens com quantidade maior que o sistema
                </p>
              </div>
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Faltas</span>
                </div>
                <p className="text-2xl font-bold">{faltas.length}</p>
                <p className="text-xs text-muted-foreground">
                  Itens com quantidade menor que o sistema
                </p>
              </div>
            </div>

            {/* Divergences List */}
            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-2 space-y-2">
                {divergencias.map((item) => (
                  <div
                    key={item.equipamentoId}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      item.divergencia > 0
                        ? "bg-success/5 border-success/30"
                        : "bg-destructive/5 border-destructive/30"
                    )}
                  >
                    <div>
                      <p className="font-medium">{item.nome}</p>
                      {item.ean && (
                        <p className="text-xs text-muted-foreground font-mono">
                          EAN: {item.ean}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">
                          Sistema: <span className="font-mono">{item.quantidadeSistema}</span>
                        </p>
                        <p>
                          Contado: <span className="font-mono font-medium">{item.quantidadeContada}</span>
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-base px-3",
                          item.divergencia > 0
                            ? "text-success border-success"
                            : "text-destructive border-destructive"
                        )}
                      >
                        {item.divergencia > 0 ? '+' : ''}{item.divergencia}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={exportarRelatorio} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          {totalDivergencias > 0 && (
            <Button onClick={onAplicarAjustes} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Aplicar Ajustes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
