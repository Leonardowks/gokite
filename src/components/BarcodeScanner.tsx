import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  X, Loader2, ScanLine, Keyboard, Flashlight, 
  ZoomIn, RotateCcw, CheckCircle
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

type ScannerStatus = "initializing" | "ready" | "confirming" | "detected" | "error";

const CONFIRMATION_THRESHOLD = 3;
const READING_WINDOW_MS = 1200;
const COOLDOWN_MS = 2500;

export function BarcodeScanner({ onScan, onClose, isSearching = false }: BarcodeScannerProps) {
  const [status, setStatus] = useState<ScannerStatus>("initializing");
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [zoomMax, setZoomMax] = useState(3);
  const [confirmProgress, setConfirmProgress] = useState(0);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const { feedback, playWarningTone, playDetectionBeep } = useScannerFeedback();
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasScannedRef = useRef(false);
  const isMountedRef = useRef(true);
  const scannerIdRef = useRef(`scanner-${Date.now()}`);
  const onScanRef = useRef(onScan);
  
  const readingsRef = useRef<{ code: string; time: number }[]>([]);
  const lastConfirmedRef = useRef<{ code: string; time: number } | null>(null);
  const progressResetRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const handleBarcodeRead = useCallback((decodedText: string) => {
    if (!isMountedRef.current || hasScannedRef.current) return;
    
    const now = Date.now();
    
    // Cooldown check
    if (lastConfirmedRef.current && 
        lastConfirmedRef.current.code === decodedText &&
        now - lastConfirmedRef.current.time < COOLDOWN_MS) {
      return;
    }
    
    // Add reading and filter old ones
    readingsRef.current.push({ code: decodedText, time: now });
    readingsRef.current = readingsRef.current.filter(r => now - r.time < READING_WINDOW_MS);
    
    const count = readingsRef.current.filter(r => r.code === decodedText).length;
    const progress = Math.min(count, CONFIRMATION_THRESHOLD);
    setConfirmProgress(progress);
    
    if (progressResetRef.current) clearTimeout(progressResetRef.current);
    progressResetRef.current = setTimeout(() => {
      if (isMountedRef.current && !hasScannedRef.current) {
        setConfirmProgress(0);
      }
    }, READING_WINDOW_MS + 100);
    
    if (count === 2) {
      playDetectionBeep();
    }
    
    if (count >= CONFIRMATION_THRESHOLD) {
      hasScannedRef.current = true;
      lastConfirmedRef.current = { code: decodedText, time: now };
      readingsRef.current = [];
      
      setLastScanned(decodedText);
      setStatus("detected");
      setConfirmProgress(CONFIRMATION_THRESHOLD);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressResetRef.current) clearTimeout(progressResetRef.current);
      
      feedback('success');
      onScanRef.current(decodedText);
    } else if (count > 0) {
      setStatus("confirming");
    }
  }, [feedback, playDetectionBeep]);

  // Toggle torch using video constraints (most compatible with iOS Safari)
  const toggleTorch = useCallback(async () => {
    const track = videoTrackRef.current;
    if (!track) return;
    
    try {
      const newState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: newState } as MediaTrackConstraintSet]
      });
      setTorchOn(newState);
      feedback('scan');
    } catch (err) {
      console.warn("Torch toggle failed:", err);
      feedback('error');
    }
  }, [torchOn, feedback]);

  // Cycle zoom using video constraints
  const cycleZoom = useCallback(async () => {
    const track = videoTrackRef.current;
    if (!track) return;
    
    try {
      const nextZoom = currentZoom >= zoomMax ? 1 : currentZoom + 1;
      await track.applyConstraints({
        advanced: [{ zoom: nextZoom } as MediaTrackConstraintSet]
      });
      setCurrentZoom(nextZoom);
      feedback('scan');
    } catch (err) {
      console.warn("Zoom cycle failed:", err);
    }
  }, [currentZoom, zoomMax, feedback]);

  const resetScanner = useCallback(() => {
    hasScannedRef.current = false;
    readingsRef.current = [];
    lastConfirmedRef.current = null;
    setLastScanned(null);
    setShowHint(false);
    setConfirmProgress(0);
    setStatus("ready");
    playWarningTone();
  }, [playWarningTone]);

  useEffect(() => {
    isMountedRef.current = true;
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 150));
      
      if (!isMountedRef.current) return;

      const element = document.getElementById(scannerIdRef.current);
      if (!element) {
        setError("Elemento do scanner não encontrado");
        setStatus("error");
        return;
      }

      try {
        scanner = new Html5Qrcode(scannerIdRef.current, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          verbose: false,
          useBarCodeDetectorIfSupported: true, // Use native detector when available
        });

        scannerRef.current = scanner;

        // iPhone Safari friendly video constraints
        const videoConstraints: MediaTrackConstraints = {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        };

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 300, height: 140 }, // Wider for barcodes
            videoConstraints,
          },
          handleBarcodeRead,
          () => {} // Ignore scan errors
        );

        if (!isMountedRef.current) return;
        setStatus("ready");

        // Get video track for torch/zoom control
        setTimeout(() => {
          if (!isMountedRef.current || !scanner) return;
          
          try {
            // Access the video element directly
            const videoEl = element.querySelector("video");
            if (videoEl && videoEl.srcObject instanceof MediaStream) {
              const track = videoEl.srcObject.getVideoTracks()[0];
              if (track) {
                videoTrackRef.current = track;
                
                // Check capabilities
                const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean; zoom?: { min: number; max: number } };
                if (caps) {
                  if (caps.torch) {
                    setHasTorch(true);
                  }
                  if (caps.zoom && caps.zoom.max > 1) {
                    setHasZoom(true);
                    setZoomMax(Math.min(caps.zoom.max, 5));
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Could not access video track:", e);
          }
        }, 500);

        // Show hint after 8 seconds if no scan
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && !hasScannedRef.current) {
            setShowHint(true);
            playWarningTone();
          }
        }, 8000);

      } catch (err: any) {
        console.error("Scanner start failed:", err);
        
        if (!isMountedRef.current) return;
        
        let msg = "Não foi possível acessar a câmera.";
        if (err?.name === "NotAllowedError") {
          msg = "Permissão de câmera negada. Permita nas configurações.";
        } else if (err?.name === "NotFoundError") {
          msg = "Nenhuma câmera encontrada no dispositivo.";
        }
        
        setError(msg);
        setStatus("error");
        feedback('error');
      }
    };

    startScanner();

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressResetRef.current) clearTimeout(progressResetRef.current);
      videoTrackRef.current = null;
      
      const currentScanner = scannerRef.current;
      scannerRef.current = null;
      
      if (currentScanner) {
        try {
          const state = currentScanner.getState();
          // Only stop if scanner is actually running or paused
          if (state === 2 || state === 3) { // SCANNING = 2, PAUSED = 3
            currentScanner.stop().catch(() => {});
          }
        } catch {
          // Scanner not initialized, ignore
        }
      }
    };
  }, [feedback, playWarningTone, handleBarcodeRead]);

  const handleManualSubmit = () => {
    if (manualCode.length >= 3) {
      feedback('success');
      onScanRef.current(manualCode.trim());
      setManualCode("");
      setShowManualInput(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "detected": return "bg-success";
      case "confirming": return "bg-primary";
      case "error": return "bg-destructive";
      case "initializing": return "bg-muted";
      default: return showHint ? "bg-warning" : "bg-primary";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "initializing": return "Iniciando câmera...";
      case "detected": return "✓ Código lido!";
      case "confirming": return `Lendo... ${confirmProgress}/${CONFIRMATION_THRESHOLD}`;
      case "error": return "Erro na câmera";
      default: return showHint ? "Aproxime ou afaste" : "Aponte para o código";
    }
  };

  return (
    <div className="flex flex-col h-full bg-black" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-black/90 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-white" />
          <span className="font-medium text-white text-sm">Scanner</span>
        </div>
        
        <div className="flex items-center gap-2">
          {hasTorch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTorch}
              className={cn(
                "h-10 w-10 rounded-full",
                torchOn ? "bg-yellow-500 text-black" : "bg-white/20 text-white"
              )}
            >
              <Flashlight className="h-5 w-5" />
            </Button>
          )}
          
          {hasZoom && (
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleZoom}
              className="h-10 w-10 rounded-full bg-white/20 text-white"
            >
              <span className="text-xs font-bold">{currentZoom}x</span>
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-white/20 text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-destructive/20 p-4 rounded-xl mb-4">
              <X className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-white text-lg font-medium mb-2">Erro</p>
            <p className="text-white/70 text-sm mb-4">{error}</p>
            <Button variant="outline" onClick={() => setShowManualInput(true)}>
              <Keyboard className="h-4 w-4 mr-2" />
              Digitar código
            </Button>
          </div>
        ) : showManualInput ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-xs space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Digite o código de barras"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="text-center text-lg h-14 bg-white"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowManualInput(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleManualSubmit}
                  disabled={manualCode.length < 3}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Camera feed */}
            <div 
              id={scannerIdRef.current}
              className="w-full h-full"
              style={{ minHeight: 300, backgroundColor: '#000' }}
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner guides */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-[300px] h-[140px]">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                  
                  {/* Animated scan line */}
                  {status !== "detected" && (
                    <div 
                      className="absolute left-2 right-2 h-0.5 bg-primary animate-pulse"
                      style={{
                        top: '50%',
                        boxShadow: '0 0 8px 2px hsl(var(--primary))'
                      }}
                    />
                  )}
                  
                  {/* Success indicator */}
                  {status === "detected" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-success/30 rounded-lg">
                      <CheckCircle className="h-12 w-12 text-success" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Initializing overlay */}
              {status === "initializing" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 text-white animate-spin mx-auto mb-2" />
                    <p className="text-white text-sm">Iniciando câmera...</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-black/90 shrink-0 space-y-3">
        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
            <span className="text-white text-sm">{getStatusText()}</span>
          </div>
          
          {/* Confirmation dots */}
          {(status === "confirming" || status === "ready") && (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((dot) => (
                <div
                  key={dot}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    confirmProgress >= dot 
                      ? dot === 3 ? "bg-success" : "bg-primary" 
                      : "bg-white/30"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Last scanned or searching indicator */}
        {isSearching && lastScanned && (
          <div className="flex items-center justify-center gap-2 py-2 bg-primary/20 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-primary text-sm">Buscando: {lastScanned}</span>
          </div>
        )}
        
        {!isSearching && lastScanned && status === "detected" && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={resetScanner}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Escanear outro código
          </Button>
        )}

        {/* Manual input button */}
        {!showManualInput && !lastScanned && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-white/60"
            onClick={() => setShowManualInput(true)}
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Digitar manualmente
          </Button>
        )}
      </div>
    </div>
  );
}
