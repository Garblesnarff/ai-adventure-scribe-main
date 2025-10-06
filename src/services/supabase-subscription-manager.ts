import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import logger from '@/lib/logger';

interface SubscriptionCallback {
  id: string;
  recordId: string;
  imageField: string;
  callback: (imageUrl: string | null) => void;
}

interface TableSubscription {
  channel: RealtimeChannel | null;
  callbacks: Map<string, SubscriptionCallback>;
  retryCount: number;
  isConnected: boolean;
  lastRetry: number;
}

/**
 * Centralized Supabase subscription manager
 * Pools connections by table to prevent over-subscription
 */
class SupabaseSubscriptionManager {
  private subscriptions = new Map<string, TableSubscription>();
  private readonly maxRetries = 2;
  private readonly retryDelay = 5000; // 5 seconds
  private readonly connectionTimeout = 15000; // 15 seconds

  /**
   * Subscribe to image updates for a specific record
   */
  subscribe(
    tableName: 'campaigns' | 'characters',
    recordId: string,
    imageField: string,
    callback: (imageUrl: string | null) => void
  ): string {
    const callbackId = `${recordId}_${imageField}_${Date.now()}`;

    // Get or create table subscription
    if (!this.subscriptions.has(tableName)) {
      this.subscriptions.set(tableName, {
        channel: null,
        callbacks: new Map(),
        retryCount: 0,
        isConnected: false,
        lastRetry: 0
      });
    }

    const subscription = this.subscriptions.get(tableName)!;

    // Add callback
    subscription.callbacks.set(callbackId, {
      id: callbackId,
      recordId,
      imageField,
      callback
    });

    // Setup or reuse channel
    this.ensureChannelConnected(tableName);

    return callbackId;
  }

  /**
   * Unsubscribe a specific callback
   */
  unsubscribe(tableName: 'campaigns' | 'characters', callbackId: string): void {
    const subscription = this.subscriptions.get(tableName);
    if (!subscription) return;

    subscription.callbacks.delete(callbackId);

    // Clean up empty subscriptions
    if (subscription.callbacks.size === 0) {
      this.cleanupTableSubscription(tableName);
    }
  }

  /**
   * Ensure a table has an active realtime channel
   */
  private ensureChannelConnected(tableName: string): void {
    const subscription = this.subscriptions.get(tableName);
    if (!subscription) return;

    // Skip if already connected or recently retried
    if (subscription.isConnected ||
        (Date.now() - subscription.lastRetry < this.retryDelay)) {
      return;
    }

    // Skip if max retries exceeded
    if (subscription.retryCount >= this.maxRetries) {
      logger.warn(`Max retries reached for ${tableName} subscription, skipping`);
      return;
    }

    this.setupChannel(tableName);
  }

  /**
   * Setup realtime channel for a table
   */
  private setupChannel(tableName: string): void {
    const subscription = this.subscriptions.get(tableName);
    if (!subscription) return;

    // Clean up existing channel
    if (subscription.channel) {
      supabase.removeChannel(subscription.channel);
    }

    logger.info(`Setting up shared channel for ${tableName}`);
    subscription.lastRetry = Date.now();

    const channel = supabase
      .channel(`shared_${tableName}_image_updates`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName
        },
        (payload) => {
          this.handleTableUpdate(tableName, payload);
        }
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus(tableName, status);
      });

    subscription.channel = channel;

    // Set connection timeout
    setTimeout(() => {
      if (!subscription.isConnected) {
        logger.warn(`Connection timeout for ${tableName} subscription`);
        this.handleConnectionFailure(tableName);
      }
    }, this.connectionTimeout);
  }

  /**
   * Handle table update events
   */
  private handleTableUpdate(
    tableName: string,
    payload: RealtimePostgresChangesPayload<{ id: string | number } & Record<string, unknown>>
  ): void {
    const subscription = this.subscriptions.get(tableName);
    if (!subscription) return;

    const recordId = payload.new?.id as string | number | undefined;
    if (!recordId) return;

    // Notify relevant callbacks
    subscription.callbacks.forEach((callbackData) => {
      if (callbackData.recordId === recordId) {
        const newImageUrl = (payload.new as Record<string, unknown>)?.[callbackData.imageField] as string | null | undefined;
        const oldImageUrl = (payload.old as Record<string, unknown>)?.[callbackData.imageField] as string | null | undefined;

        // Only trigger if image field actually changed
        if (newImageUrl !== oldImageUrl) {
          logger.info(`Image updated for ${tableName} ${recordId}: ${newImageUrl}`);
          callbackData.callback(newImageUrl || null);
        }
      }
    });
  }

  /**
   * Handle subscription status changes
   */
  private handleSubscriptionStatus(tableName: string, status: string): void {
    const subscription = this.subscriptions.get(tableName);
    if (!subscription) return;

    logger.info(`Subscription status for ${tableName}: ${status}`);

    switch (status) {
      case 'SUBSCRIBED':
        subscription.isConnected = true;
        subscription.retryCount = 0;
        break;

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        subscription.isConnected = false;
        this.handleConnectionFailure(tableName);
        break;

      case 'CLOSED':
        subscription.isConnected = false;
        break;
    }
  }

  /**
   * Handle connection failures with exponential backoff
   */
  private handleConnectionFailure(tableName: string): void {
    const subscription = this.subscriptions.get(tableName);
    if (!subscription) return;

    subscription.retryCount++;
    subscription.isConnected = false;

    if (subscription.retryCount < this.maxRetries) {
      const delay = this.retryDelay * Math.pow(2, subscription.retryCount - 1);
      logger.info(`Retrying ${tableName} subscription in ${delay}ms (${subscription.retryCount}/${this.maxRetries})`);

      setTimeout(() => {
        this.setupChannel(tableName);
      }, delay);
    } else {
      logger.warn(`Max retries exceeded for ${tableName} subscription`);
    }
  }

  /**
   * Clean up a table subscription
   */
  private cleanupTableSubscription(tableName: string): void {
    const subscription = this.subscriptions.get(tableName);
    if (!subscription) return;

    logger.info(`Cleaning up ${tableName} subscription`);

    if (subscription.channel) {
      supabase.removeChannel(subscription.channel);
    }

    this.subscriptions.delete(tableName);
  }

  /**
   * Clean up all subscriptions (for app shutdown)
   */
  cleanup(): void {
    logger.info('Cleaning up all Supabase subscriptions');

    this.subscriptions.forEach((subscription, tableName) => {
      if (subscription.channel) {
        supabase.removeChannel(subscription.channel);
      }
    });

    this.subscriptions.clear();
  }
}

// Export singleton instance
export const subscriptionManager = new SupabaseSubscriptionManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    subscriptionManager.cleanup();
  });
}