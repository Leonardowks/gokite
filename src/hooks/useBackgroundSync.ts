import { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  getSyncQueue, 
  removeFromSyncQueue, 
  incrementRetry,
  getPendingSyncCount,
  OfflineOperation
} from '@/lib/syncQueue';
import { markTransacaoSynced, clearSyncedTransacoes } from './useOfflineTransacoes';

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
  const queryClient = useQueryClient();
  const syncInProgress = useRef(false);

  // Process a single sync operation
  const processOperation = useCallback(async (operation: OfflineOperation): Promise<boolean> => {
    console.log('[BackgroundSync] Processing:', operation.type, operation.entity, operation.data);
    
    try {
      // Handle transacao sync to Supabase
      if (operation.entity === 'transacao' && operation.type === 'create') {
        const transacaoData = operation.data;
        
        // Remove offline-specific fields
        const { offline_id, synced, ...insertData } = transacaoData as Record<string, unknown>;
        
        const { error } = await supabase
          .from('transacoes')
          .insert({
            tipo: insertData.tipo as string,
            origem: (insertData.origem as string) || 'outros',
            descricao: insertData.descricao as string || null,
            valor_bruto: insertData.valor_bruto as number,
            custo_produto: (insertData.custo_produto as number) || 0,
            centro_de_custo: (insertData.centro_de_custo as string) || 'Administrativo',
            forma_pagamento: (insertData.forma_pagamento as string) || 'dinheiro',
            parcelas: (insertData.parcelas as number) || 1,
            data_transacao: (insertData.data_transacao as string) || new Date().toISOString().split('T')[0],
          });

        if (error) {
          console.error('[BackgroundSync] Transacao sync error:', error);
          throw error;
        }

        // Mark as synced in offline storage
        if (offline_id) {
          markTransacaoSynced(offline_id as string);
        }

        console.log('[BackgroundSync] Transacao synced successfully');
        return true;
      }

      // For other entities, simulate success (legacy behavior)
      await new Promise((resolve) => setTimeout(resolve, 300));
      return true;
    } catch (error) {
      console.error('[BackgroundSync] Operation failed:', error);
      return false;
    }
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

    // Clean up synced transacoes from localStorage
    clearSyncedTransacoes();

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['transacoes'] });
    queryClient.invalidateQueries({ queryKey: ['transacoes-summary'] });

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
        title: '✅ Sincronização Completa',
        description: `${successCount} ${successCount === 1 ? 'transação sincronizada' : 'transações sincronizadas'} com sucesso.`,
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
  }, [processOperation, toast, queryClient]);

  // Listen for online event
  useEffect(() => {
    const handleOnline = () => {
      console.log('[BackgroundSync] Back online - starting sync');
      toast({
        title: '🌐 Conexão Restaurada',
        description: 'Sincronizando transações pendentes...',
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
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...status,
    syncAll,
    hasPendingOperations: status.pendingCount > 0,
  };
}
