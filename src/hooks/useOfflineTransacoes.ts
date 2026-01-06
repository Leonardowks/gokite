import { useState, useEffect, useCallback } from 'react';
import { addToSyncQueue, getSyncQueue, OfflineOperation } from '@/lib/syncQueue';
import { TransacaoInsert } from './useTransacoes';
import { toast } from 'sonner';

const OFFLINE_TRANSACOES_KEY = 'gokite_offline_transacoes';

export interface OfflineTransacao extends TransacaoInsert {
  offline_id: string;
  created_at: string;
  synced: boolean;
}

// Get offline transacoes from localStorage
function getOfflineTransacoes(): OfflineTransacao[] {
  try {
    const stored = localStorage.getItem(OFFLINE_TRANSACOES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save offline transacoes to localStorage
function saveOfflineTransacoes(transacoes: OfflineTransacao[]): void {
  localStorage.setItem(OFFLINE_TRANSACOES_KEY, JSON.stringify(transacoes));
}

// Add a transacao offline
export function addOfflineTransacao(transacao: TransacaoInsert): OfflineTransacao {
  const offlineTransacao: OfflineTransacao = {
    ...transacao,
    offline_id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    synced: false,
  };

  const transacoes = getOfflineTransacoes();
  transacoes.push(offlineTransacao);
  saveOfflineTransacoes(transacoes);

  // Also add to sync queue
  addToSyncQueue('create', 'transacao', offlineTransacao as unknown as Record<string, unknown>);

  console.log('[OfflineTransacoes] Added:', offlineTransacao.offline_id);
  return offlineTransacao;
}

// Mark a transacao as synced
export function markTransacaoSynced(offlineId: string): void {
  const transacoes = getOfflineTransacoes();
  const index = transacoes.findIndex(t => t.offline_id === offlineId);
  if (index !== -1) {
    transacoes[index].synced = true;
    saveOfflineTransacoes(transacoes);
  }
}

// Remove synced transacoes from localStorage
export function clearSyncedTransacoes(): void {
  const transacoes = getOfflineTransacoes();
  const pending = transacoes.filter(t => !t.synced);
  saveOfflineTransacoes(pending);
}

// Get count of pending offline transacoes
export function getPendingTransacoesCount(): number {
  return getOfflineTransacoes().filter(t => !t.synced).length;
}

// Hook to manage offline transacoes
export function useOfflineTransacoes() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getPendingTransacoesCount());
  const [offlineTransacoes, setOfflineTransacoes] = useState<OfflineTransacao[]>(getOfflineTransacoes);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingCount(getPendingTransacoesCount());
      setOfflineTransacoes(getOfflineTransacoes());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Add transacao (handles both online and offline)
  const addTransacao = useCallback((transacao: TransacaoInsert): { offline: boolean; data: OfflineTransacao | null } => {
    if (!navigator.onLine) {
      const offlineData = addOfflineTransacao(transacao);
      toast.info('📴 Transação salva offline', {
        description: 'Será sincronizada quando voltar online.',
      });
      setPendingCount(getPendingTransacoesCount());
      setOfflineTransacoes(getOfflineTransacoes());
      return { offline: true, data: offlineData };
    }
    return { offline: false, data: null };
  }, []);

  // Get pending transacoes for sync queue display
  const getPendingTransacoes = useCallback((): OfflineTransacao[] => {
    return getOfflineTransacoes().filter(t => !t.synced);
  }, []);

  // Get transacao queue items
  const getTransacaoQueueItems = useCallback((): OfflineOperation[] => {
    return getSyncQueue().filter(op => op.entity === 'transacao');
  }, []);

  return {
    isOnline,
    pendingCount,
    offlineTransacoes,
    addTransacao,
    getPendingTransacoes,
    getTransacaoQueueItems,
    markTransacaoSynced,
    clearSyncedTransacoes,
  };
}
