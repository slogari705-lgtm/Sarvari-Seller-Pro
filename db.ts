
import { AppState, DbSnapshot, SyncAction } from './types';

const DB_NAME = 'SarvariPOS_DB';
const DB_VERSION = 2; // Incremented version
const STORE_NAME = 'app_state';
const BACKUP_STORE = 'backups';
const SYNC_STORE = 'sync_queue';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(BACKUP_STORE)) {
        db.createObjectStore(BACKUP_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        db.createObjectStore(SYNC_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveState = async (state: AppState): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(state, 'current');
};

export const loadState = async (): Promise<AppState | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('current');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// Sync Queue Helpers
export const addToSyncQueue = async (action: SyncAction): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(SYNC_STORE, 'readwrite');
  const store = tx.objectStore(SYNC_STORE);
  store.put(action);
};

export const getSyncQueue = async (): Promise<SyncAction[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(SYNC_STORE, 'readonly');
    const store = tx.objectStore(SYNC_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
  });
};

export const removeFromSyncQueue = async (id: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(SYNC_STORE, 'readwrite');
  const store = tx.objectStore(SYNC_STORE);
  store.delete(id);
};

export const createSnapshot = async (state: AppState, label: string): Promise<void> => {
  const db = await initDB();
  const snapshot: DbSnapshot = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(state)), // Deep clone
    label,
    stats: {
      products: state.products.filter(p => !p.isDeleted).length,
      customers: state.customers.filter(c => !c.isDeleted).length,
      invoices: state.invoices.filter(i => !i.isDeleted).length
    }
  };
  const tx = db.transaction(BACKUP_STORE, 'readwrite');
  const store = tx.objectStore(BACKUP_STORE);
  store.put(snapshot);

  // Auto-cleanup: Keep only last 20 snapshots
  const countRequest = store.count();
  countRequest.onsuccess = () => {
    if (countRequest.result > 20) {
      const cursorRequest = store.openCursor();
      cursorRequest.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
        }
      };
    }
  };
};

export const getSnapshots = async (): Promise<DbSnapshot[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(BACKUP_STORE, 'readonly');
    const store = tx.objectStore(BACKUP_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
  });
};
