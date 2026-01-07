import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, Loader2, ScanLine, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useScannerFeedback } from "@/hooks/useScannerFeedback";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  isSearching?: boolean;
}

export function BarcodeScanner({ onScan, onClose, isSearching = false }: BarcodeScannerProps) {
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [noDetectionTimeout, setNoDetectionTimeout] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { feedback } = useScannerFeedback();
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        if (!containerRef.current) return;

        const scanner = new Html5Qrcode("barcode-reader", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            if (isMounted && decodedText !== lastScanned) {
              setLastScanned(decodedText);
              setNoDetectionTimeout(false);
              
              // Clear timeout on successful scan
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              
              // Feedback sonoro + háptico
              feedback('success');
              
              // Flash visual feedback
              const element = document.getElementById("barcode-reader");
              if (element) {
                element.classList.add("ring-4", "ring-green-500");
                setTimeout(() => {
                  element.classList.remove("ring-4", "ring-green-500");
                }, 300);
              }
              onScan(decodedText);
            }
          },
          () => {
            // Ignore errors during scanning
          }
        );

        if (isMounted) {
          setIsStarting(false);
          
          // Set timeout to show manual input option after 10 seconds
          timeoutRef.current = setTimeout(() => {
            if (isMounted) {
              setNoDetectionTimeout(true);
            }
          }, 10000);
        }
      } catch (err) {
        console.error("Scanner error:", err);
        if (isMounted) {
          setError("Não foi possível acessar a câmera. Verifique as permissões.");
          setIsStarting(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan, lastScanned, feedback]);

  const handleManualSubmit = () => {
    if (manualCode.length >= 3) {
      feedback('success');
      onScan(manualCode.trim());
      setManualCode("");
      setShowManualInput(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="font-semibold">Scanner de Código de Barras</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4" ref={containerRef}>
          {error ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <Camera className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => setShowManualInput(true)}>
                <Keyboard className="h-4 w-4 mr-2" />
                Digitar código manualmente
              </Button>
              <Button onClick={onClose}>Fechar</Button>
            </div>
          ) : showManualInput ? (
            <div className="w-full max-w-sm space-y-4">
              <div className="text-center">
                <Keyboard className="h-10 w-10 mx-auto text-primary mb-2" />
                <h3 className="font-semibold">Entrada Manual</h3>
                <p className="text-sm text-muted-foreground">
                  Digite o código de barras abaixo
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ex: 7896044956525"
                  className="font-mono"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                />
                <Button onClick={handleManualSubmit} disabled={manualCode.length < 3}>
                  OK
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
            <>
              <div
                id="barcode-reader"
                className={cn(
                  "w-full max-w-sm rounded-xl overflow-hidden transition-all duration-200",
                  isStarting && "opacity-50",
                  noDetectionTimeout && "ring-2 ring-yellow-500/50"
                )}
              />
              
              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-sm">Iniciando câmera...</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Instructions / Manual Button */}
        <div className="p-4 text-center border-t bg-muted/50 space-y-3">
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Buscando produto...</span>
            </div>
          ) : lastScanned ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Código detectado:</p>
              <p className="text-lg font-mono font-bold text-primary">{lastScanned}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Aponte a câmera para o código de barras do produto
              </p>
              {(noDetectionTimeout || !isStarting) && !showManualInput && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualInput(true)}
                  className="mt-2"
                >
                  <Keyboard className="h-4 w-4 mr-2" />
                  Não detectou? Digitar manualmente
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
