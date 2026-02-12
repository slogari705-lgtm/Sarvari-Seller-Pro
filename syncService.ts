
import { SyncAction, SyncActionType } from './types';
import { addToSyncQueue, getSyncQueue, removeFromSyncQueue } from './db';

/**
 * Sarvari Offline Sync Manager
 * Handles queuing actions when offline and processing them when online.
 */

export const queueSyncAction = async (type: SyncActionType, payload: any) => {
  const action: SyncAction = {
    id: Math.random().toString(36).substr(2, 9),
    type,
    timestamp: new Date().toISOString(),
    payload,
    status: 'pending',
    retryCount: 0
  };
  
  await addToSyncQueue(action);
  
  // Try immediate sync if online
  if (navigator.onLine) {
    processSyncQueue();
  }
};

let isSyncing = false;

export const processSyncQueue = async () => {
  if (isSyncing || !navigator.onLine) return;
  
  const queue = await getSyncQueue();
  if (queue.length === 0) return;
  
  isSyncing = true;
  console.log(`[Sync] Processing ${queue.length} pending actions...`);
  
  for (const action of queue) {
    try {
      // Simulate API call to a central cloud server
      // In a real app, this would be: await fetch('/api/sync', { method: 'POST', body: JSON.stringify(action) });
      await simulateCloudUpload(action);
      
      // If successful, remove from local queue
      await removeFromSyncQueue(action.id);
      console.log(`[Sync] Action ${action.type} synced successfully.`);
    } catch (error) {
      console.error(`[Sync] Failed to sync action ${action.id}:`, error);
      // Logic for retry count could be added here
    }
  }
  
  isSyncing = false;
  // Dispatch event to UI to update sync status
  window.dispatchEvent(new CustomEvent('sarvari-sync-complete'));
};

const simulateCloudUpload = (action: SyncAction): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Artificial latency
    setTimeout(() => {
      // Randomly fail 5% of the time to test robustness
      if (Math.random() < 0.05) {
        reject(new Error("Network Timeout"));
      } else {
        resolve();
      }
    }, 1000);
  });
};

// Global listener for reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Sync] Back online, triggering queue processing.');
    processSyncQueue();
  });
}
