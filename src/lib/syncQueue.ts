// Queue for offline operations that need syncing
interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'aula' | 'cliente' | 'aluguel' | 'equipamento' | 'lead';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

const SYNC_QUEUE_KEY = 'gokite_sync_queue';
const MAX_RETRIES = 3;

// Get pending operations from queue
export function getSyncQueue(): OfflineOperation[] {
  try {
    const queue = localStorage.getItem(SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

// Save queue to localStorage
function saveSyncQueue(queue: OfflineOperation[]): void {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

// Add operation to sync queue
export function addToSyncQueue(
  type: OfflineOperation['type'],
  entity: OfflineOperation['entity'],
  data: Record<string, unknown>
): void {
  const queue = getSyncQueue();
  const operation: OfflineOperation = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    entity,
    data,
    timestamp: Date.now(),
    retries: 0,
  };
  queue.push(operation);
  saveSyncQueue(queue);
  console.log('[SyncQueue] Added operation:', operation.type, operation.entity);
}

// Remove operation from queue
export function removeFromSyncQueue(operationId: string): void {
  const queue = getSyncQueue();
  const filtered = queue.filter((op) => op.id !== operationId);
  saveSyncQueue(filtered);
}

// Increment retry count
export function incrementRetry(operationId: string): boolean {
  const queue = getSyncQueue();
  const operation = queue.find((op) => op.id === operationId);
  
  if (operation) {
    operation.retries += 1;
    if (operation.retries >= MAX_RETRIES) {
      // Move to failed queue
      const failedKey = `${SYNC_QUEUE_KEY}_failed`;
      const failed = JSON.parse(localStorage.getItem(failedKey) || '[]');
      failed.push(operation);
      localStorage.setItem(failedKey, JSON.stringify(failed));
      removeFromSyncQueue(operationId);
      console.log('[SyncQueue] Operation moved to failed queue:', operationId);
      return false;
    }
    saveSyncQueue(queue);
    return true;
  }
  return false;
}

// Clear entire queue
export function clearSyncQueue(): void {
  localStorage.removeItem(SYNC_QUEUE_KEY);
}

// Get count of pending operations
export function getPendingSyncCount(): number {
  return getSyncQueue().length;
}

// Get failed operations
export function getFailedOperations(): OfflineOperation[] {
  try {
    const failed = localStorage.getItem(`${SYNC_QUEUE_KEY}_failed`);
    return failed ? JSON.parse(failed) : [];
  } catch {
    return [];
  }
}

// Clear failed operations
export function clearFailedOperations(): void {
  localStorage.removeItem(`${SYNC_QUEUE_KEY}_failed`);
}

// Retry failed operations
export function retryFailedOperations(): void {
  const failed = getFailedOperations();
  failed.forEach((op) => {
    op.retries = 0;
    addToSyncQueue(op.type, op.entity, op.data);
  });
  clearFailedOperations();
}
