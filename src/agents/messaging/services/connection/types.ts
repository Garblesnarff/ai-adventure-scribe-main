export interface ConnectionState {
  status: 'connected' | 'disconnected';
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  reconnecting: boolean;
}

export interface ConnectionEvent {
  type: 'stateChange' | 'reconnectionAttempt' | 'reconnectionSuccess' | 'reconnectionFailure';
  timestamp: Date;
  data?: any;
}

export interface ReconnectionConfig {
  initialDelay: number;
  maxDelay: number;
  factor: number;
  jitter: boolean;
}

export interface ReconnectionState {
  attempts: number;
  lastAttempt: Date | null;
  nextAttemptDelay: number;
}
