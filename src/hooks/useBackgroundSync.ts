import { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  getSyncQueue, 
  removeFromSyncQueue, 
  incrementRetry,
  getPendingSyncCount 
} from '@/lib/syncQueue';

interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  error: string | null;
}

export function useBackgroundSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: getPendingSyncCount(),
    lastSyncAt: null,
    error: null,
  });
  const { toast } = useToast();
  const syncInProgress = useRef(false);

  // Process a single sync operation
  const processOperation = useCallback(async (operation: ReturnType<typeof getSyncQueue>[0]) => {
    // Since we're using localStorage mock data, we just need to confirm the operation
    // In a real app, this would call Supabase APIs
    console.log('[BackgroundSync] Processing:', operation.type, operation.entity, operation.data);
    
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // For demo purposes, all operations succeed
    // In real implementation, you would:
    // - Call supabase.from(operation.entity).insert/update/delete(operation.data)
    // - Handle errors appropriately
    return true;
  }, []);

  // Sync all pending operations
  const syncAll = useCallback(async () => {
    if (syncInProgress.current) {
      console.log('[BackgroundSync] Sync already in progress');
      return;
    }

    const queue = getSyncQueue();
    if (queue.length === 0) {
      console.log('[BackgroundSync] No pending operations');
      return;
    }

    syncInProgress.current = true;
    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    console.log(`[BackgroundSync] Starting sync of ${queue.length} operations`);
    
    let successCount = 0;
    let failCount = 0;

    for (const operation of queue) {
      try {
        const success = await processOperation(operation);
        if (success) {
          removeFromSyncQueue(operation.id);
          successCount++;
        } else {
          const shouldRetry = incrementRetry(operation.id);
          if (!shouldRetry) failCount++;
        }
      } catch (error) {
        console.error('[BackgroundSync] Operation failed:', error);
        const shouldRetry = incrementRetry(operation.id);
        if (!shouldRetry) failCount++;
      }
    }

    syncInProgress.current = false;
    
    const newPendingCount = getPendingSyncCount();
    setStatus({
      isSyncing: false,
      pendingCount: newPendingCount,
      lastSyncAt: new Date(),
      error: failCount > 0 ? `${failCount} operações falharam` : null,
    });

    // Show toast notification
    if (successCount > 0) {
      toast({
        title: 'Sincronização Completa',
        description: `${successCount} ${successCount === 1 ? 'operação sincronizada' : 'operações sincronizadas'} com sucesso.`,
      });
    }

    if (failCount > 0) {
      toast({
        title: 'Algumas operações falharam',
        description: `${failCount} ${failCount === 1 ? 'operação falhou' : 'operações falharam'}. Serão tentadas novamente.`,
        variant: 'destructive',
      });
    }

    console.log(`[BackgroundSync] Completed: ${successCount} success, ${failCount} failed`);
  }, [processOperation, toast]);

  // Listen for online event
  useEffect(() => {
    const handleOnline = () => {
      console.log('[BackgroundSync] Back online - starting sync');
      toast({
        title: 'Conexão Restaurada',
        description: 'Sincronizando dados...',
      });
      // Small delay to ensure connection is stable
      setTimeout(syncAll, 1000);
    };

    window.addEventListener('online', handleOnline);
    
    // Initial sync if online and has pending operations
    if (navigator.onLine && getPendingSyncCount() > 0) {
      syncAll();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncAll, toast]);

  // Update pending count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus((prev) => ({
        ...prev,
        pendingCount: getPendingSyncCount(),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...status,
    syncAll,
    hasPendingOperations: status.pendingCount > 0,
  };
}
