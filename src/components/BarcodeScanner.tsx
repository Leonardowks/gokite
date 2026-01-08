import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Keyboard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  isSearching?: boolean;
}

export function BarcodeScanner({ onScan, onClose, isSearching = false }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const hasStartedRef = useRef(false);
  const scannerIdRef = useRef(`scanner-${Date.now()}`);
  
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'error'>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    isMountedRef.current = true;
    hasStartedRef.current = false;
    
    const startScanner = async () => {
      // Wait for DOM to be ready
      await new Promise(r => setTimeout(r, 100));
      
      if (!isMountedRef.current) return;
      
      const element = document.getElementById(scannerIdRef.current);
      if (!element) {
        setError('Elemento do scanner não encontrado');
        setStatus('error');
        return;
      }

      try {
        const scanner = new Html5Qrcode(scannerIdRef.current);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
          },
          (decodedText) => {
            if (isMountedRef.current && decodedText) {
              onScan(decodedText);
            }
          },
          () => {}
        );

        if (isMountedRef.current) {
          hasStartedRef.current = true;
          setStatus('scanning');
        }
      } catch (err: any) {
        console.error('Scanner error:', err);
        if (isMountedRef.current) {
          setStatus('error');
          let msg = 'Não foi possível acessar a câmera.';
          if (err?.name === 'NotAllowedError') {
            msg = 'Permissão de câmera negada.';
          } else if (err?.name === 'NotFoundError') {
            msg = 'Nenhuma câmera encontrada.';
          }
          setError(msg);
        }
      }
    };

    startScanner();

    return () => {
      isMountedRef.current = false;
      
      const scanner = scannerRef.current;
      scannerRef.current = null;
      
      if (scanner && hasStartedRef.current) {
        scanner.stop().catch(() => {});
      }
    };
  }, [onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (code) {
      onScan(code);
      setManualCode('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80">
        <span className="text-white font-medium">Scanner</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative">
        <div 
          id={scannerIdRef.current} 
          className="w-full h-full"
          style={{ minHeight: 300, backgroundColor: '#000' }}
        />

        {/* Overlay */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-32">
              <div className="absolute inset-0 border-2 border-white/80 rounded-lg" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-green-500 animate-pulse" />
            </div>
          </div>
        )}

        {/* Initializing */}
        {status === 'initializing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <Loader2 className="h-10 w-10 text-white animate-spin mx-auto mb-2" />
              <p className="text-white">Iniciando câmera...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-6">
              <Camera className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-white mb-4">{error}</p>
              <Button onClick={() => setShowManualInput(true)}>
                Digitar manualmente
              </Button>
            </div>
          </div>
        )}

        {/* Manual Input */}
        {showManualInput && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6">
            <form onSubmit={handleManualSubmit} className="w-full max-w-sm space-y-4">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Digite o código de barras"
                className="text-center text-lg"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowManualInput(false)}
                >
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" disabled={!manualCode.trim()}>
                  Confirmar
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-black/80">
        {isSearching ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
            <p className="text-white">Buscando...</p>
          </div>
        ) : status === 'scanning' ? (
          <div className="space-y-3">
            <p className="text-center text-white/80 text-sm">
              Aponte para o código de barras
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowManualInput(true)}
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Digitar manualmente
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
