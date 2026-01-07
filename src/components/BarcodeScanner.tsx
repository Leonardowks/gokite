import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from "html5-qrcode";
import { 
  X, Camera, Loader2, ScanLine, Keyboard, Flashlight, 
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

type ScannerStatus = "initializing" | "ready" | "scanning" | "confirming" | "detected" | "error";

// Reading confirmation system - requires 3 consistent readings
interface CodeReading {
  code: string;
  timestamp: number;
}

const CONFIRMATION_THRESHOLD = 3; // Number of consistent readings needed
const READING_WINDOW_MS = 1200; // Time window for readings - increased for stability
const COOLDOWN_MS = 2500; // Cooldown after successful scan

export function BarcodeScanner({ onScan, onClose, isSearching = false }: BarcodeScannerProps) {
  const [status, setStatus] = useState<ScannerStatus>("initializing");
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [zoomLimits, setZoomLimits] = useState({ min: 1, max: 3, step: 0.5 });
  const [confirmProgress, setConfirmProgress] = useState(0); // 0-3 confirmation dots
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { feedback, playWarningTone, playDetectionBeep } = useScannerFeedback();
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasScannedRef = useRef(false);
  const isMountedRef = useRef(true);
  const scannerIdRef = useRef(`barcode-reader-${Date.now()}`);
  const onScanRef = useRef(onScan);
  
  // Reading confirmation refs
  const readingsRef = useRef<CodeReading[]>([]);
  const lastConfirmedRef = useRef<{ code: string; timestamp: number } | null>(null);
  const confirmProgressResetRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep onScan ref updated
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Handle barcode read with confirmation system
  const handleBarcodeRead = useCallback((decodedText: string) => {
    if (!isMountedRef.current || hasScannedRef.current) return;
    
    const now = Date.now();
    
    // Check cooldown - ignore if we just confirmed this code
    if (lastConfirmedRef.current && 
        lastConfirmedRef.current.code === decodedText &&
        now - lastConfirmedRef.current.timestamp < COOLDOWN_MS) {
      return;
    }
    
    // Add new reading
    readingsRef.current.push({ code: decodedText, timestamp: now });
    
    // Keep only readings within the time window
    readingsRef.current = readingsRef.current.filter(
      r => now - r.timestamp < READING_WINDOW_MS
    );
    
    // Count readings of the current code
    const sameCodeCount = readingsRef.current.filter(
      r => r.code === decodedText
    ).length;
    
    // Update visual progress
    const progressValue = Math.min(sameCodeCount, CONFIRMATION_THRESHOLD);
    setConfirmProgress(progressValue);
    
    // Clear progress reset timer
    if (confirmProgressResetRef.current) {
      clearTimeout(confirmProgressResetRef.current);
    }
    
    // Reset progress after window if no new readings
    confirmProgressResetRef.current = setTimeout(() => {
      if (isMountedRef.current && !hasScannedRef.current) {
        setConfirmProgress(0);
      }
    }, READING_WINDOW_MS + 100);
    
    // Play subtle beep on second detection (not every frame, avoid false positives)
    if (sameCodeCount === 2) {
      playDetectionBeep();
    }
    
    // Check if we have enough confirmations
    if (sameCodeCount >= CONFIRMATION_THRESHOLD) {
      // CODE CONFIRMED!
      hasScannedRef.current = true;
      lastConfirmedRef.current = { code: decodedText, timestamp: now };
      readingsRef.current = [];
      
      setLastScanned(decodedText);
      setStatus("detected");
      setConfirmProgress(CONFIRMATION_THRESHOLD);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (confirmProgressResetRef.current) clearTimeout(confirmProgressResetRef.current);
      
      // Success feedback
      feedback('success');
      
      // Visual flash effect
      const flashEl = document.getElementById("scanner-flash");
      if (flashEl) {
        flashEl.classList.add("opacity-100");
        setTimeout(() => flashEl.classList.remove("opacity-100"), 150);
      }
      
      // Trigger callback
      onScanRef.current(decodedText);
    } else if (sameCodeCount > 0) {
      // Show confirming status
      setStatus("confirming");
    }
  }, [feedback, playDetectionBeep]);

  // Toggle torch with state verification and fallback
  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current) return;
    
    try {
      // Verify scanner is in valid state
      const state = scannerRef.current.getState();
      if (state !== Html5QrcodeScannerState.SCANNING && 
          state !== Html5QrcodeScannerState.PAUSED) {
        console.warn("Scanner not in valid state for torch");
        return;
      }
      
      const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
      const torch = capabilities.torchFeature();
      
      if (!torch.isSupported()) {
        console.warn("Torch not supported on this device");
        return;
      }
      
      const newState = !torchOn;
      await torch.apply(newState);
      setTorchOn(newState);
      feedback('scan');
      
    } catch (err) {
      console.error("Torch toggle failed:", err);
      // Try alternative method via video constraints
      try {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: !torchOn } as MediaTrackConstraintSet]
        });
        setTorchOn(!torchOn);
        feedback('scan');
      } catch (fallbackErr) {
        console.error("Torch fallback also failed:", fallbackErr);
        feedback('error');
      }
    }
  }, [torchOn, feedback]);

  // Cycle zoom with state verification
  const cycleZoom = useCallback(async () => {
    if (!scannerRef.current) return;
    
    try {
      // Verify scanner is in valid state
      const state = scannerRef.current.getState();
      if (state !== Html5QrcodeScannerState.SCANNING && 
          state !== Html5QrcodeScannerState.PAUSED) {
        return;
      }
      
      const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
      const zoomCap = capabilities.zoomFeature();
      
      if (!zoomCap.isSupported()) return;
      
      const currentZoom = zoomCap.value() || zoom;
      const minZ = zoomCap.min();
      const maxZ = zoomCap.max();
      const step = zoomCap.step() || 0.5;
      
      // Cycle zoom levels respecting camera limits
      let nextZoom = currentZoom + step;
      if (nextZoom > maxZ) nextZoom = minZ;
      
      await zoomCap.apply(nextZoom);
      setZoom(nextZoom);
      feedback('scan');
    } catch (err) {
      console.warn("Zoom change failed:", err);
    }
  }, [zoom, feedback]);

  // Reset scanner for new scan
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

    const tryStartCamera = async (facingMode: "environment" | "user"): Promise<boolean> => {
      if (!isMountedRef.current) return false;
      
      const element = document.getElementById(scannerIdRef.current);
      if (!element) {
        console.error("Scanner element not found");
        return false;
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
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode },
          {
            fps: 5, // Lower FPS for more stable readings
            qrbox: { width: 280, height: 100 },
          },
          handleBarcodeRead,
          () => {
            // Silently handle scan errors
          }
        );

        return true;
      } catch (err: any) {
        console.warn(`Camera ${facingMode} failed:`, err?.name, err?.message);
        
        // Clean up failed scanner instance
        if (scanner) {
          try {
            await scanner.stop();
          } catch {}
          scanner = null;
          scannerRef.current = null;
        }
        
        return false;
      }
    };

    const startScanner = async () => {
      // Wait for next frame to ensure DOM is ready
      await new Promise(resolve => requestAnimationFrame(resolve));
      // Additional small delay for mobile browsers
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isMountedRef.current) return;

      // Try environment camera first (back camera)
      let started = await tryStartCamera("environment");
      
      // If environment fails, try user camera (front camera)
      if (!started && isMountedRef.current) {
        console.log("Trying front camera as fallback...");
        started = await tryStartCamera("user");
      }

      if (!isMountedRef.current) return;

      if (started) {
        setStatus("ready");
        
        // Detect camera capabilities with retry mechanism
        const detectCapabilities = async (retryCount = 0) => {
          try {
            if (!scannerRef.current || !isMountedRef.current) return;
            
            // Verify scanner is in valid state before accessing capabilities
            const state = scannerRef.current.getState();
            if (state !== Html5QrcodeScannerState.SCANNING) {
              if (retryCount < 5) {
                setTimeout(() => detectCapabilities(retryCount + 1), 400);
                return;
              }
              console.warn("Scanner never reached SCANNING state for capabilities");
              return;
            }
            
            const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
            
            // Check torch capability
            try {
              const torch = capabilities.torchFeature();
              const torchSupported = torch.isSupported();
              setHasTorch(torchSupported);
              console.log("Torch capability:", torchSupported);
            } catch (e) {
              console.warn("Torch feature not available:", e);
            }
            
            // Check zoom capability
            try {
              const zoomCap = capabilities.zoomFeature();
              const zoomSupported = zoomCap.isSupported();
              if (zoomSupported) {
                setHasZoom(true);
                setZoomLimits({
                  min: zoomCap.min(),
                  max: zoomCap.max(),
                  step: zoomCap.step() || 0.5
                });
                const currentZoom = zoomCap.value();
                if (currentZoom) setZoom(currentZoom);
                console.log("Zoom capability:", { min: zoomCap.min(), max: zoomCap.max() });
              }
            } catch (e) {
              console.warn("Zoom feature not available:", e);
            }
          } catch (err) {
            console.warn("Could not detect capabilities, retrying...", err);
            if (retryCount < 5) {
              setTimeout(() => detectCapabilities(retryCount + 1), 400);
            }
          }
        };
        
        // Start capability detection after scanner is stable
        setTimeout(() => detectCapabilities(), 600);
        
        // Show positioning hint after 6 seconds if no scan
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && !hasScannedRef.current) {
            setShowHint(true);
            playWarningTone();
          }
        }, 6000);
      } else {
        // Both cameras failed
        let errorMessage = "Não foi possível acessar a câmera.";
        
        // Check for specific browser/permission issues
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          errorMessage = "Seu navegador não suporta acesso à câmera. Use Chrome, Safari ou Firefox.";
        } else {
          try {
            // Check permissions
            const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
            if (result.state === 'denied') {
              errorMessage = "Permissão de câmera negada. Permita nas configurações do navegador.";
            }
          } catch {
            // permissions API not supported
          }
        }
        
        setError(errorMessage);
        setStatus("error");
        feedback('error');
      }
    };

    startScanner();

    return () => {
      isMountedRef.current = false;
      hasScannedRef.current = false;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (confirmProgressResetRef.current) {
        clearTimeout(confirmProgressResetRef.current);
        confirmProgressResetRef.current = null;
      }
      
      // Robust cleanup
      if (scannerRef.current) {
        const currentScanner = scannerRef.current;
        scannerRef.current = null;
        
        currentScanner.stop().catch((err) => {
          console.warn("Scanner stop error (expected on unmount):", err);
        });
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
      case "detected": return "Código confirmado!";
      case "confirming": return `Confirmando... (${confirmProgress}/${CONFIRMATION_THRESHOLD})`;
      case "error": return "Erro na câmera";
      default: return showHint ? "Aproxime ou afaste o código" : "Aponte para o código de barras";
    }
  };

  // Confirmation progress dots
  const ConfirmationDots = () => (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((dot) => (
        <div
          key={dot}
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-all duration-150",
            confirmProgress >= dot 
              ? dot === 3 ? "bg-success scale-110" : "bg-primary" 
              : "bg-white/20"
          )}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background" ref={containerRef}>
      {/* Flash overlay */}
      <div 
        id="scanner-flash"
        className="absolute inset-0 bg-success/30 pointer-events-none opacity-0 transition-opacity duration-150 z-10"
      />
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
            status === "detected" ? "bg-success/20" : 
            status === "confirming" ? "bg-primary/20" : "bg-primary/10"
          )}>
            <ScanLine className={cn(
              "h-5 w-5 transition-colors",
              status === "detected" ? "text-success" : 
              status === "confirming" ? "text-primary animate-pulse" : "text-primary"
            )} />
          </div>
          <div>
            <span className="font-semibold text-base">Scanner de Código</span>
            <p className="text-xs text-muted-foreground">EAN, UPC, Code128, Code39</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {status !== "error" && !showManualInput && (
            <>
              {/* Torch button - only shows if camera supports it */}
              {hasTorch && (
                <Button 
                  variant={torchOn ? "default" : "ghost"} 
                  size="icon" 
                  onClick={toggleTorch}
                  className={cn("h-10 w-10", torchOn && "bg-warning text-warning-foreground")}
                  title="Lanterna"
                >
                  <Flashlight className="h-5 w-5" />
                </Button>
              )}
              {/* Zoom button - only shows if camera supports it */}
              {hasZoom && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={cycleZoom}
                  className="h-10 w-10"
                  title={`Zoom: ${zoom.toFixed(1)}x`}
                >
                  {zoom <= zoomLimits.min 
                    ? <ZoomIn className="h-5 w-5" /> 
                    : <span className="text-xs font-bold">{zoom.toFixed(1)}x</span>}
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className={cn(
        "h-1 transition-all duration-300 shrink-0",
        getStatusColor(),
        (status === "ready" || status === "confirming") && "animate-pulse"
      )} />

      {/* Scanner Area */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 bg-black/95 overflow-hidden">
        {error ? (
          <div className="text-center space-y-4 text-white px-4">
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
            {/* Torch active indicator */}
            {torchOn && (
              <div className="absolute top-2 left-2 bg-warning/90 text-warning-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 z-20 animate-pulse">
                <Flashlight className="h-3 w-3" />
                Lanterna ON
              </div>
            )}
            
            {/* Scanner viewport */}
            <div className="relative">
              <div
                id={scannerIdRef.current}
                className={cn(
                  "w-full rounded-2xl overflow-hidden transition-all duration-300",
                  status === "initializing" && "opacity-50"
                )}
                style={{ minHeight: '280px', backgroundColor: '#000' }}
              />
              
              {/* Laser line overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[85%] h-[60%] relative">
                  {/* Corners */}
                  <div className={cn(
                    "absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg transition-colors",
                    status === "confirming" ? "border-primary" : 
                    status === "detected" ? "border-success" : "border-primary"
                  )} />
                  <div className={cn(
                    "absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg transition-colors",
                    status === "confirming" ? "border-primary" : 
                    status === "detected" ? "border-success" : "border-primary"
                  )} />
                  <div className={cn(
                    "absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg transition-colors",
                    status === "confirming" ? "border-primary" : 
                    status === "detected" ? "border-success" : "border-primary"
                  )} />
                  <div className={cn(
                    "absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-lg transition-colors",
                    status === "confirming" ? "border-primary" : 
                    status === "detected" ? "border-success" : "border-primary"
                  )} />
                  
                  {/* Animated laser line */}
                  {(status === "ready" || status === "confirming") && (
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
                      <div className={cn(
                        "h-0.5 rounded-full transition-colors",
                        status === "confirming" ? "bg-primary animate-pulse" :
                        showHint ? "bg-warning animate-pulse" : "bg-primary animate-pulse"
                      )} 
                      style={{
                        boxShadow: status === "confirming" 
                          ? '0 0 12px 3px hsl(var(--primary))' 
                          : showHint 
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
            
            {/* Status indicator with confirmation dots */}
            <div className={cn(
              "mt-4 py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors",
              status === "detected" ? "bg-success/20" : 
              status === "confirming" ? "bg-primary/20" :
              showHint ? "bg-warning/20" : "bg-white/10"
            )}>
              {status === "confirming" || (status === "ready" && confirmProgress > 0) ? (
                <ConfirmationDots />
              ) : (
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  getStatusColor()
                )} />
              )}
              <span className={cn(
                "text-sm font-medium",
                status === "detected" ? "text-success" :
                status === "confirming" ? "text-primary" :
                showHint ? "text-warning" : "text-white/80"
              )}>
                {getStatusText()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-background space-y-3 shrink-0">
        {isSearching ? (
          <div className="flex items-center justify-center gap-2 py-2 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="font-medium">Buscando produto no sistema...</span>
          </div>
        ) : lastScanned ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/20">
            <div>
              <p className="text-xs text-muted-foreground">Código confirmado</p>
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
              {showHint 
                ? "Ajuste distância ou iluminação" 
                : "Posicione o código no centro"}
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
  );
}
