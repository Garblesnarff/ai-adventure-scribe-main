import { StorageConfig } from '../types';

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  dbName: 'agentMessaging',
  messageStoreName: 'messages',
  queueStoreName: 'queueState',
  offlineStoreName: 'offlineState',
  version: 1,
};