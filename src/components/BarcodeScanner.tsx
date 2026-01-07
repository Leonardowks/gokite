import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  X, Camera, Loader2, ScanLine, Keyboard, Flashlight, 
  ZoomIn, ZoomOut, RotateCcw, CheckCircle, AlertCircle,
  Focus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useScannerFeedback } from "@/hooks/useScannerFeedback";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  isSearching?: boolean;
}

type ScannerStatus = "initializing" | "ready" | "scanning" | "detected" | "error";

export function BarcodeScanner({ onScan, onClose, isSearching = false }: BarcodeScannerProps) {
  const [status, setStatus] = useState<ScannerStatus>("initializing");
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { feedback, playSuccessBeep, playWarningTone } = useScannerFeedback();
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current) return;
    
    try {
      const track = (scannerRef.current as any).getRunningTrackCameraCapabilities?.();
      if (track?.torchFeature?.isSupported()) {
        await track.torchFeature.apply(!torchOn);
        setTorchOn(!torchOn);
      }
    } catch (err) {
      console.warn("Torch toggle failed:", err);
    }
  }, [torchOn]);

  // Toggle zoom
  const cycleZoom = useCallback(async () => {
    const nextZoom = zoom >= 3 ? 1 : zoom + 1;
    setZoom(nextZoom);
    
    try {
      const track = (scannerRef.current as any).getRunningTrackCameraCapabilities?.();
      if (track?.zoomFeature?.isSupported()) {
        await track.zoomFeature.apply(nextZoom);
      }
    } catch (err) {
      console.warn("Zoom change failed:", err);
    }
  }, [zoom]);

  // Reset scanner
  const resetScanner = useCallback(() => {
    setLastScanned(null);
    setAttempts(0);
    setStatus("ready");
    playWarningTone();
  }, [playWarningTone]);

  // Ref to prevent duplicate scans
  const hasScannedRef = useRef(false);
  const scannerIdRef = useRef(`barcode-reader`);

  useEffect(() => {
    let isMounted = true;
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        const element = document.getElementById(scannerIdRef.current);
        if (!element || !isMounted) return;

        scanner = new Html5Qrcode(scannerIdRef.current, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 300, height: 120 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            // Prevent duplicate scans
            if (!hasScannedRef.current && isMounted) {
              hasScannedRef.current = true;
              setLastScanned(decodedText);
              setStatus("detected");
              
              // Clear timeouts
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              if (attemptTimeoutRef.current) clearInterval(attemptTimeoutRef.current);
              
              // Multi-sensory feedback
              feedback('success');
              
              // Visual flash effect
              const element = document.getElementById(scannerIdRef.current);
              if (element) {
                element.classList.add("ring-4", "ring-success", "scale-[1.02]");
                setTimeout(() => {
                  element.classList.remove("ring-4", "ring-success", "scale-[1.02]");
                }, 400);
              }
              
              // Screen flash
              const flash = document.getElementById("scanner-flash");
              if (flash) {
                flash.classList.add("opacity-100");
                setTimeout(() => flash.classList.remove("opacity-100"), 150);
              }
              
              onScan(decodedText);
            }
          },
          () => {
            // Silently handle scan errors
          }
        );

        if (isMounted) {
          setStatus("ready");
          
          // Check for torch capability
          try {
            const track = (scanner as any).getRunningTrackCameraCapabilities?.();
            if (track?.torchFeature?.isSupported()) {
              setHasTorch(true);
            }
          } catch {
            // Torch not supported
          }
          
          // Set timeout to show manual input option after 8 seconds
          timeoutRef.current = setTimeout(() => {
            if (isMounted && !hasScannedRef.current) {
              playWarningTone();
            }
          }, 8000);
          
          // Attempt counter timeout
          attemptTimeoutRef.current = setInterval(() => {
            if (isMounted && !hasScannedRef.current) {
              setAttempts(prev => prev + 1);
            }
          }, 2000);
        }
      } catch (err: any) {
        console.error("Scanner error:", err);
        if (isMounted) {
          // Handle specific camera errors
          let errorMessage = "Não foi possível acessar a câmera.";
          
          if (err?.name === 'NotAllowedError') {
            errorMessage = "Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.";
          } else if (err?.name === 'NotFoundError') {
            errorMessage = "Câmera não encontrada. Verifique se seu dispositivo possui câmera.";
          } else if (err?.name === 'NotReadableError') {
            errorMessage = "Câmera em uso por outro aplicativo.";
          } else if (err?.name === 'OverconstrainedError') {
            errorMessage = "Câmera traseira não disponível. Tentando câmera frontal...";
          }
          
          setError(errorMessage);
          setStatus("error");
          feedback('error');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      hasScannedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (attemptTimeoutRef.current) clearInterval(attemptTimeoutRef.current);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan, feedback, playWarningTone]);

  const handleManualSubmit = () => {
    if (manualCode.length >= 3) {
      feedback('success');
      onScan(manualCode.trim());
      setManualCode("");
      setShowManualInput(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "detected": return "bg-success";
      case "error": return "bg-destructive";
      case "initializing": return "bg-muted";
      default: return attempts > 3 ? "bg-warning" : "bg-primary";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "initializing": return "Iniciando câmera...";
      case "detected": return "Código detectado!";
      case "error": return "Erro na câmera";
      default: return attempts > 3 ? "Posicione o código de barras" : "Buscando código...";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Flash overlay */}
      <div 
        id="scanner-flash"
        className="absolute inset-0 bg-success/30 pointer-events-none opacity-0 transition-opacity duration-150 z-10"
      />
      
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              status === "detected" ? "bg-success/20" : "bg-primary/10"
            )}>
              <ScanLine className={cn(
                "h-5 w-5 transition-colors",
                status === "detected" ? "text-success" : "text-primary"
              )} />
            </div>
            <div>
              <span className="font-semibold text-base">Scanner de Código</span>
              <p className="text-xs text-muted-foreground">EAN, UPC, Code128, Code39</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Toolbar */}
            {status !== "error" && !showManualInput && (
              <>
                {hasTorch && (
                  <Button 
                    variant={torchOn ? "default" : "ghost"} 
                    size="icon" 
                    onClick={toggleTorch}
                    className="h-9 w-9"
                  >
                    <Flashlight className={cn("h-4 w-4", torchOn && "text-warning")} />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={cycleZoom}
                  className="h-9 w-9"
                >
                  {zoom === 1 ? <ZoomIn className="h-4 w-4" /> : <span className="text-xs font-bold">{zoom}x</span>}
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className={cn(
          "h-1 transition-all duration-300",
          getStatusColor(),
          status === "ready" && "animate-pulse"
        )} />

        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-black/95" ref={containerRef}>
          {error ? (
            <div className="text-center space-y-4 text-white">
              <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
                <Camera className="h-10 w-10 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-medium">Câmera indisponível</p>
                <p className="text-sm text-white/60 mt-1">{error}</p>
              </div>
              <Button variant="secondary" onClick={() => setShowManualInput(true)} className="gap-2">
                <Keyboard className="h-4 w-4" />
                Digitar código manualmente
              </Button>
            </div>
          ) : showManualInput ? (
            <div className="w-full max-w-sm space-y-6 p-4 bg-background rounded-2xl">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Keyboard className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Entrada Manual</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Digite o código de barras do produto
                </p>
              </div>
              <div className="space-y-3">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ex: 7896044956525"
                  className="font-mono text-lg text-center h-14"
                  autoFocus
                  inputMode="numeric"
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                />
                <Button 
                  onClick={handleManualSubmit} 
                  disabled={manualCode.length < 3}
                  className="w-full h-12 text-base gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  Confirmar Código
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowManualInput(false)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Voltar para câmera
              </Button>
            </div>
          ) : (
            <div className="relative w-full max-w-md">
              {/* Scanner viewport */}
              <div className="relative">
                <div
                  id="barcode-reader"
                  className={cn(
                    "w-full rounded-2xl overflow-hidden transition-all duration-300",
                    status === "initializing" && "opacity-50"
                  )}
                />
                
                {/* Laser line overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[85%] h-[60%] relative">
                    {/* Corners */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
                    
                    {/* Animated laser line */}
                    {status === "ready" && (
                      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
                        <div className={cn(
                          "h-0.5 rounded-full animate-pulse",
                          attempts > 3 ? "bg-warning" : "bg-primary"
                        )} 
                        style={{
                          boxShadow: attempts > 3 
                            ? '0 0 8px 2px hsl(var(--warning))' 
                            : '0 0 8px 2px hsl(var(--primary))'
                        }}
                        />
                      </div>
                    )}
                    
                    {/* Success checkmark */}
                    {status === "detected" && (
                      <div className="absolute inset-0 flex items-center justify-center animate-scale-in">
                        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                          <CheckCircle className="h-10 w-10 text-success" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Loading overlay */}
                {status === "initializing" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                    <div className="flex flex-col items-center gap-3 text-white">
                      <Loader2 className="h-10 w-10 animate-spin" />
                      <span className="text-sm font-medium">Iniciando câmera...</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status indicator */}
              <div className={cn(
                "mt-4 py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors",
                status === "detected" ? "bg-success/20" : 
                attempts > 3 ? "bg-warning/20" : "bg-white/10"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  getStatusColor()
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  status === "detected" ? "text-success" :
                  attempts > 3 ? "text-warning" : "text-white/80"
                )}>
                  {getStatusText()}
                </span>
                {attempts > 0 && status === "ready" && (
                  <span className="text-xs text-white/50">
                    Tentativa {Math.min(attempts, 10)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-background space-y-3">
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-medium">Buscando produto no sistema...</span>
            </div>
          ) : lastScanned ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/20">
              <div>
                <p className="text-xs text-muted-foreground">Código detectado</p>
                <p className="text-xl font-mono font-bold text-success">{lastScanned}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={resetScanner} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Novo scan
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {attempts > 5 
                  ? "Dificuldade para ler? Tente ajustar a distância ou iluminação" 
                  : "Posicione o código de barras no centro da tela"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualInput(true)}
                className="gap-2 shrink-0"
              >
                <Keyboard className="h-4 w-4" />
                Manual
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
