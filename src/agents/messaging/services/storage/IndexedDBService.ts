import { StoredMessage, QueueState, OfflineState } from './types';
import { DatabaseInitializer } from './core/DatabaseInitializer';
import { DEFAULT_STORAGE_CONFIG } from './config/StorageConfig';

export class IndexedDBService {
  private static instance: IndexedDBService;
  private db: IDBDatabase | null = null;

  private constructor() {
    this.initDatabase();
  }

  public static getInstance(): IndexedDBService {
    if (!IndexedDBService.instance) {
      IndexedDBService.instance = new IndexedDBService();
    }
    return IndexedDBService.instance;
  }

  private async initDatabase(): Promise<void> {
    try {
      this.db = await DatabaseInitializer.initDatabase();
    } catch (error) {
      console.error('[IndexedDB] Initialization error:', error);
      throw error;
    }
  }

  public async storeMessage(message: StoredMessage): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEFAULT_STORAGE_CONFIG.messageStoreName], 'readwrite');
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.messageStoreName);
      const request = store.put(message);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('[IndexedDB] Message stored successfully:', message.id);
        resolve();
      };
    });
  }

  public async getMessage(id: string): Promise<StoredMessage | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEFAULT_STORAGE_CONFIG.messageStoreName], 'readonly');
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.messageStoreName);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  public async updateMessageStatus(id: string, status: StoredMessage['status']): Promise<void> {
    const message = await this.getMessage(id);
    if (!message) {
      throw new Error(`Message ${id} not found`);
    }

    return this.storeMessage({ ...message, status });
  }

  public async getPendingMessages(): Promise<StoredMessage[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEFAULT_STORAGE_CONFIG.messageStoreName], 'readonly');
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.messageStoreName);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  public async saveQueueState(state: QueueState): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEFAULT_STORAGE_CONFIG.queueStoreName], 'readwrite');
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.queueStoreName);
      const request = store.put({ id: 'current', ...state });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('[IndexedDB] Queue state saved successfully');
        resolve();
      };
    });
  }

  public async getQueueState(): Promise<QueueState | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEFAULT_STORAGE_CONFIG.queueStoreName], 'readonly');
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.queueStoreName);
      const request = store.get('current');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  public async saveOfflineState(state: OfflineState): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEFAULT_STORAGE_CONFIG.offlineStoreName], 'readwrite');
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.offlineStoreName);
      const request = store.put({ id: 'current', ...state });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('[IndexedDB] Offline state saved successfully');
        resolve();
      };
    });
  }

  public async getOfflineState(): Promise<OfflineState | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEFAULT_STORAGE_CONFIG.offlineStoreName], 'readonly');
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.offlineStoreName);
      const request = store.get('current');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const state = request.result;
        resolve(state ? state : null);
      };
    });
  }

  public async clearOldMessages(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const cutoffTime = new Date(Date.now() - maxAgeMs).toISOString();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEFAULT_STORAGE_CONFIG.messageStoreName], 'readwrite');
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.messageStoreName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          console.log('[IndexedDB] Old messages cleared successfully');
          resolve();
        }
      };
    });
  }
}