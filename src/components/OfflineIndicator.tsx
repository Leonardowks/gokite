import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { WifiOff, RefreshCw, CloudOff, Cloud, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function OfflineIndicator() {
  const { isOnline, updateAvailable, skipWaiting } = useServiceWorker();
  const { isSyncing, pendingCount, hasPendingOperations, syncAll } = useBackgroundSync();

  // Nothing to show if online with no updates and no pending sync
  if (isOnline && !updateAvailable && !hasPendingOperations && !isSyncing) return null;

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-warning/95 text-warning-foreground px-4 py-2.5 text-center text-sm font-medium animate-fade-in-up">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            <span>Você está offline.</span>
            {hasPendingOperations && (
              <Badge variant="secondary" className="bg-warning-foreground/20 text-warning-foreground text-xs">
                <CloudOff className="h-3 w-3 mr-1" />
                {pendingCount} {pendingCount === 1 ? 'alteração pendente' : 'alterações pendentes'}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Syncing Banner */}
      {isOnline && isSyncing && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-primary/95 text-primary-foreground px-4 py-2.5 text-center text-sm font-medium animate-fade-in-up">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Sincronizando {pendingCount} {pendingCount === 1 ? 'operação' : 'operações'}...</span>
          </div>
        </div>
      )}

      {/* Pending Sync Banner (Online but has pending operations) */}
      {isOnline && !isSyncing && hasPendingOperations && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-accent/95 text-accent-foreground px-4 py-2.5 text-center text-sm font-medium animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Cloud className="h-4 w-4 flex-shrink-0" />
            <span>{pendingCount} {pendingCount === 1 ? 'alteração para sincronizar' : 'alterações para sincronizar'}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={syncAll}
              className="h-7 text-xs bg-accent-foreground/20 hover:bg-accent-foreground/30"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Sincronizar Agora
            </Button>
          </div>
        </div>
      )}

      {/* Update Available Banner */}
      {updateAvailable && isOnline && !isSyncing && !hasPendingOperations && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-primary/95 text-primary-foreground px-4 py-2.5 text-center text-sm font-medium animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Check className="h-4 w-4 flex-shrink-0" />
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
        </div>
      )}
    </>
  );
}
