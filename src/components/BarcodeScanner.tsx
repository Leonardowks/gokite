import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { feedback } = useScannerFeedback();
  const containerRef = useRef<HTMLDivElement>(null);

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
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan, lastScanned]);

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
              <Button onClick={onClose}>Fechar</Button>
            </div>
          ) : (
            <>
              <div
                id="barcode-reader"
                className={cn(
                  "w-full max-w-sm rounded-xl overflow-hidden transition-all duration-200",
                  isStarting && "opacity-50"
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

        {/* Instructions */}
        <div className="p-4 text-center border-t bg-muted/50">
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
            <p className="text-sm text-muted-foreground">
              Aponte a câmera para o código de barras do produto
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
