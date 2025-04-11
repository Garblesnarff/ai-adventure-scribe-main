import { DEFAULT_STORAGE_CONFIG } from '../config/StorageConfig';

export class DatabaseInitializer {
  public static async initDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DEFAULT_STORAGE_CONFIG.dbName, DEFAULT_STORAGE_CONFIG.version);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('[IndexedDB] Database opened successfully');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(DEFAULT_STORAGE_CONFIG.messageStoreName)) {
          const messageStore = db.createObjectStore(DEFAULT_STORAGE_CONFIG.messageStoreName, { keyPath: 'id' });
          messageStore.createIndex('status', 'status', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(DEFAULT_STORAGE_CONFIG.queueStoreName)) {
          db.createObjectStore(DEFAULT_STORAGE_CONFIG.queueStoreName, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(DEFAULT_STORAGE_CONFIG.offlineStoreName)) {
          db.createObjectStore(DEFAULT_STORAGE_CONFIG.offlineStoreName, { keyPath: 'id' });
        }
      };
    });
  }
}