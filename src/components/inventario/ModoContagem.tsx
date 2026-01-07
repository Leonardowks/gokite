import { useState, useEffect, useCallback } from "react";
import { X, ScanLine, CheckCircle2, Clock, AlertTriangle, Package, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useScannerFeedback } from "@/hooks/useScannerFeedback";
import { cn } from "@/lib/utils";
import type { SessaoContagem, ContagemItem } from "@/hooks/useInventario";

interface ModoContagemProps {
  sessao: SessaoContagem;
  onScan: (ean: string, quantidade?: number) => { success: boolean; item?: ContagemItem; error?: string } | null;
  onEncerrar: () => void;
}

export function ModoContagem({ sessao, onScan, onEncerrar }: ModoContagemProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { feedback, playSuccessBeep, playErrorBuzz } = useScannerFeedback();

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - sessao.inicioEm.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessao.inicioEm]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalItens = sessao.itensConferidos.length + sessao.itensPendentes.length;
  const conferidos = sessao.itensConferidos.length;
  const progresso = totalItens > 0 ? (conferidos / totalItens) * 100 : 0;
  const divergencias = sessao.itensConferidos.filter(i => i.divergencia !== 0).length;

  const handleScan = useCallback((code: string) => {
    const result = onScan(code, 1);
    
    if (result?.success) {
      playSuccessBeep();
      feedback('success');
      setLastResult({ success: true, message: `✓ ${result.item?.nome} conferido` });
    } else {
      playErrorBuzz();
      feedback('error');
      setLastResult({ success: false, message: result?.error || 'Código não encontrado' });
    }

    setShowScanner(false);
    setTimeout(() => setLastResult(null), 3000);
  }, [onScan, playSuccessBeep, playErrorBuzz, feedback]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScan(manualInput.trim());
      setManualInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Contagem Física</h2>
            <p className="text-xs text-muted-foreground">
              Escaneie ou digite os códigos de barras
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-success" />
            {conferidos}/{totalItens}
          </Badge>
          <Button variant="destructive" size="sm" onClick={onEncerrar}>
            <X className="h-4 w-4 mr-1" />
            Encerrar
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 bg-muted/30 border-b">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {formatTime(elapsedTime)}
            </span>
            {divergencias > 0 && (
              <span className="flex items-center gap-1.5 text-warning">
                <AlertTriangle className="h-4 w-4" />
                {divergencias} divergências
              </span>
            )}
          </div>
          <span className="font-medium">{Math.round(progresso)}%</span>
        </div>
        <Progress value={progresso} className="h-2" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Scanner Section */}
        <div className="lg:w-1/2 p-4 flex flex-col gap-4">
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <Button
              size="lg"
              className="h-32 w-full max-w-sm gap-4 text-lg"
              onClick={() => setShowScanner(true)}
            >
              <ScanLine className="h-8 w-8" />
              Abrir Scanner
            </Button>

            <div className="w-full max-w-sm">
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite o EAN ou nome..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Confirmar
                </Button>
              </form>
            </div>

            {/* Last result feedback */}
            {lastResult && (
              <div
                className={cn(
                  "p-4 rounded-xl text-center font-medium transition-all animate-in fade-in slide-in-from-bottom-2",
                  lastResult.success
                    ? "bg-success/20 text-success"
                    : "bg-destructive/20 text-destructive"
                )}
              >
                {lastResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Lists Section */}
        <div className="lg:w-1/2 flex flex-col border-t lg:border-t-0 lg:border-l">
          {/* Conferidos */}
          <div className="flex-1 flex flex-col border-b">
            <div className="p-3 bg-success/10 border-b flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="font-medium text-sm">Conferidos ({conferidos})</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sessao.itensConferidos.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Nenhum item conferido ainda
                  </p>
                ) : (
                  sessao.itensConferidos.map((item) => (
                    <div
                      key={item.equipamentoId}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        item.divergencia !== 0
                          ? "bg-warning/10 border border-warning/30"
                          : "bg-success/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">{item.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {item.quantidadeContada}
                        </Badge>
                        {item.divergencia !== 0 && (
                          <Badge variant="outline" className="text-warning border-warning">
                            {item.divergencia > 0 ? '+' : ''}{item.divergencia}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Pendentes */}
          <div className="flex-1 flex flex-col">
            <div className="p-3 bg-muted/50 border-b flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Pendentes ({sessao.itensPendentes.length})</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sessao.itensPendentes.map((item) => (
                  <div
                    key={item.equipamentoId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.nome}</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-muted-foreground">
                      {item.quantidadeSistema}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="p-0 max-w-lg h-[85vh] overflow-hidden">
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
            isSearching={false}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}