/**
 * Storage Configuration
 *
 * This file defines the default configuration for the client-side storage
 * system (IndexedDB) used by the messaging service. It includes database name,
 * object store names, and database version.
 *
 * Main Export:
 * - DEFAULT_STORAGE_CONFIG: An object containing default storage settings.
 *
 * Key Dependencies:
 * - StorageConfig type (from `../types.ts`)
 *
 * @author AI Dungeon Master Team
 */

// Project Types
import { StorageConfig } from '../types';

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  dbName: 'agentMessaging',
  messageStoreName: 'messages',
  queueStoreName: 'queueState',
  offlineStoreName: 'offlineState',
  version: 1,
  cleanup: {
    maxMessageAgeMs: 24 * 60 * 60 * 1000, // 24 hours
    checkIntervalMs: 6 * 60 * 60 * 1000, // 6 hours
  },
};
