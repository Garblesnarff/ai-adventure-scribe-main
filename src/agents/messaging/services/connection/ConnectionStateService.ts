import { supabase } from '@/integrations/supabase/client';
import { ConnectionState, ReconnectionConfig } from './types';
import { EventEmitter } from './EventEmitter';
import { MessageQueueService } from '../MessageQueueService';
import { MessagePersistenceService } from '../storage/MessagePersistenceService';
import { OfflineStateService } from '../offline/OfflineStateService';
import { ReconnectionManager } from './ReconnectionManager';
import { ConnectionStateManager } from './ConnectionStateManager';

export class ConnectionStateService {
  private static instance: ConnectionStateService;
  private eventEmitter: EventEmitter;
  private reconnectionManager: ReconnectionManager;
  private stateManager: ConnectionStateManager;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    
    const config: ReconnectionConfig = {
      initialDelay: 1000,
      maxDelay: 30000,
      factor: 2,
      jitter: true
    };

    this.reconnectionManager = new ReconnectionManager(
      config,
      this.eventEmitter
    );

    this.stateManager = new ConnectionStateManager(
      this.eventEmitter,
      MessageQueueService.getInstance(),
      MessagePersistenceService.getInstance(),
      OfflineStateService.getInstance()
    );

    this.initializeListeners();
  }

  public static getInstance(): ConnectionStateService {
    if (!ConnectionStateService.instance) {
      ConnectionStateService.instance = new ConnectionStateService();
    }
    return ConnectionStateService.instance;
  }

  private initializeListeners(): void {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        this.handleOnline();
      } else if (event === 'SIGNED_OUT') {
        this.handleOffline();
      }
    });

    this.eventEmitter.on('reconnectionAttempt', () => {
      this.attemptReconnection();
    });
  }

  private async handleOnline(): Promise<void> {
    await this.stateManager.handleConnectionRestored();
    this.reconnectionManager.reset();
  }

  private async handleOffline(): Promise<void> {
    await this.stateManager.handleConnectionLost();
    this.reconnectionManager.startReconnection();
  }

  private async attemptReconnection(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        throw new Error('Failed to reconnect');
      }
      await this.handleOnline();
    } catch (error) {
      console.error('[ConnectionStateService] Reconnection attempt failed:', error);
      this.reconnectionManager.startReconnection();
    }
  }

  public getState(): ConnectionState {
    return this.stateManager.getState();
  }

  public onConnectionStateChanged(callback: (state: ConnectionState) => void): void {
    this.eventEmitter.on('connectionStateChanged', callback);
  }

  public onReconnectionFailed(callback: (data: any) => void): void {
    this.eventEmitter.on('reconnectionFailed', callback);
  }

  public onReconnectionSuccessful(callback: (data: any) => void): void {
    this.eventEmitter.on('reconnectionSuccessful', callback);
  }

  public onReconnectionError(callback: (data: any) => void): void {
    this.eventEmitter.on('reconnectionError', callback);
  }
}