import { useServiceWorker } from '@/hooks/useServiceWorker';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineIndicator() {
  const { isOnline, updateAvailable, skipWaiting } = useServiceWorker();

  if (isOnline && !updateAvailable) return null;

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-warning/95 text-warning-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 animate-fade-in-up">
          <WifiOff className="h-4 w-4" />
          <span>Você está offline. Os dados salvos localmente ainda estão disponíveis.</span>
        </div>
      )}

      {/* Update Available Banner */}
      {updateAvailable && isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-primary/95 text-primary-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-3 animate-fade-in-up">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Nova versão disponível!</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={skipWaiting}
            className="h-7 text-xs"
          >
            Atualizar Agora
          </Button>
        </div>
      )}
    </>
  );
}
