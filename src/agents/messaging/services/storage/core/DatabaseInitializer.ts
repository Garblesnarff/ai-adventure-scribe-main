/**
 * IndexedDB Database Initializer
 *
 * This file defines the DatabaseInitializer class, which provides a static method
 * to initialize the IndexedDB database for the messaging system. It handles
 * opening the database and creating object stores during the upgrade process
 * based on the defined storage configuration.
 *
 * Main Class:
 * - DatabaseInitializer: Contains the static `initDatabase` method.
 *
 * Key Dependencies:
 * - DEFAULT_STORAGE_CONFIG from `../config/storage-config.ts`.
 *
 * @author AI Dungeon Master Team
 */

// Project Config
import { DEFAULT_STORAGE_CONFIG } from '../config/StorageConfig';
import { logger } from '../../../../../lib/logger';

export class DatabaseInitializer {
  public static async initDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DEFAULT_STORAGE_CONFIG.dbName, DEFAULT_STORAGE_CONFIG.version);

      request.onerror = () => {
        logger.error('[IndexedDB] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        logger.info('[IndexedDB] Database opened successfully');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(DEFAULT_STORAGE_CONFIG.messageStoreName)) {
          const messageStore = db.createObjectStore(DEFAULT_STORAGE_CONFIG.messageStoreName, {
            keyPath: 'id',
          });
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
