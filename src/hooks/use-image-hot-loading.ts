import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseImageHotLoadingOptions {
  tableName: 'campaigns' | 'characters';
  recordId: string;
  imageField?: string;
  fallbackImage?: string;
}

interface ImageHotLoadingState {
  imageUrl: string;
  isLoading: boolean;
  hasImage: boolean;
  error: string | null;
  retryCount: number;
  connectionStatus: 'connecting' | 'connected' | 'timeout' | 'error';
}

/**
 * Custom hook for hot loading background images with realtime updates
 * Subscribes to Supabase realtime changes and automatically updates when images are generated
 */
export const useImageHotLoading = ({
  tableName,
  recordId,
  imageField = 'background_image',
  fallbackImage = '/card-placeholder.svg'
}: UseImageHotLoadingOptions): ImageHotLoadingState => {
  const [state, setState] = useState<ImageHotLoadingState>({
    imageUrl: fallbackImage,
    isLoading: false,
    hasImage: false,
    error: null,
    retryCount: 0,
    connectionStatus: 'connecting'
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;
  const pollingInterval = 2000; // 2 seconds
  const maxPollingDuration = 30000; // 30 seconds

  // Fallback polling mechanism
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let pollCount = 0;
    const maxPolls = maxPollingDuration / pollingInterval;

    console.log(`Starting fallback polling for ${tableName} record ${recordId}`);

    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;

      try {
        const { data, error } = await supabase
          .from(tableName)
          .select(imageField)
          .eq('id', recordId)
          .single();

        if (error) {
          console.error('Polling error:', error);
          return;
        }

        const imageUrl = data?.[imageField];
        if (imageUrl && imageUrl !== state.imageUrl) {
          console.log('Image found via polling:', imageUrl);
          setState(prev => ({
            ...prev,
            imageUrl: imageUrl || fallbackImage,
            hasImage: !!imageUrl,
            isLoading: false,
            error: null,
            connectionStatus: 'connected'
          }));

          // Stop polling once we find the image
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error('Polling fetch error:', err);
      }

      // Stop polling after max duration
      if (pollCount >= maxPolls) {
        console.log('Polling timeout reached');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, pollingInterval);
  }, [tableName, recordId, imageField, fallbackImage, state.imageUrl]);

  useEffect(() => {
    let isMounted = true;

    // Fetch initial image state
    const fetchInitialImage = async () => {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select(imageField)
          .eq('id', recordId)
          .single();

        if (error) {
          console.error(`Error fetching initial ${imageField}:`, error);
          if (isMounted) {
            setState(prev => ({
              ...prev,
              error: error.message,
              isLoading: false,
              connectionStatus: 'error'
            }));
          }
          return;
        }

        const imageUrl = data?.[imageField];
        if (isMounted) {
          setState(prev => ({
            ...prev,
            imageUrl: imageUrl || fallbackImage,
            hasImage: !!imageUrl,
            isLoading: false,
            error: null,
            connectionStatus: 'connected'
          }));
        }
      } catch (err) {
        console.error('Failed to fetch initial image:', err);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: 'Failed to load image',
            isLoading: false,
            connectionStatus: 'error'
          }));
        }
      }
    };

    // Set up realtime subscription with retry logic
    const setupRealtimeSubscription = (retryCount = 0) => {
      try {
        const channel = supabase
          .channel(`${tableName}_${recordId}_image_updates_${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: tableName,
              filter: `id=eq.${recordId}`
            },
            (payload) => {
              console.log(`Received ${tableName} update:`, payload);

              const newImageUrl = payload.new?.[imageField];
              const oldImageUrl = payload.old?.[imageField];

              // Only update if the image field actually changed
              if (newImageUrl !== oldImageUrl) {
                if (isMounted) {
                  setState(prev => ({
                    ...prev,
                    imageUrl: newImageUrl || fallbackImage,
                    hasImage: !!newImageUrl,
                    isLoading: false,
                    error: null,
                    connectionStatus: 'connected'
                  }));
                }

                // Stop polling if we receive realtime update
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
              }
            }
          )
          .subscribe((status) => {
            console.log(`Realtime subscription status for ${tableName}:`, status);

            if (isMounted) {
              setState(prev => ({ ...prev, connectionStatus: status as any }));
            }

            if (status === 'SUBSCRIBED') {
              console.log(`Successfully subscribed to ${tableName} updates for record ${recordId}`);
              if (isMounted) {
                setState(prev => ({ ...prev, connectionStatus: 'connected', error: null }));
              }
            } else if (status === 'CHANNEL_ERROR') {
              console.error(`Failed to subscribe to ${tableName} updates`);
              if (isMounted) {
                setState(prev => ({ ...prev, connectionStatus: 'error' }));
              }
              handleSubscriptionFailure(retryCount);
            } else if (status === 'TIMED_OUT') {
              console.warn(`Subscription timed out for ${tableName}`);
              if (isMounted) {
                setState(prev => ({ ...prev, connectionStatus: 'timeout' }));
              }
              handleSubscriptionFailure(retryCount);
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('Failed to set up realtime subscription:', err);
        handleSubscriptionFailure(retryCount);
      }
    };

    // Handle subscription failures with retry and fallback
    const handleSubscriptionFailure = (currentRetryCount: number) => {
      if (currentRetryCount < maxRetries) {
        console.log(`Retrying subscription (${currentRetryCount + 1}/${maxRetries})`);

        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }

        retryTimeoutRef.current = setTimeout(() => {
          if (isMounted) {
            setState(prev => ({ ...prev, retryCount: currentRetryCount + 1 }));
            setupRealtimeSubscription(currentRetryCount + 1);
          }
        }, Math.pow(2, currentRetryCount) * 1000); // Exponential backoff
      } else {
        console.warn('Max retries reached, falling back to polling');
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: 'Realtime connection failed, using fallback polling',
            connectionStatus: 'error'
          }));
        }
        // Start polling as fallback
        startPolling();
      }
    };

    // Initialize
    setState(prev => ({ ...prev, isLoading: true }));
    fetchInitialImage();
    setupRealtimeSubscription();

    // Cleanup function
    return () => {
      isMounted = false;
      if (channelRef.current) {
        console.log(`Unsubscribing from ${tableName} updates`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [tableName, recordId, imageField, fallbackImage, startPolling]);

  return state;
};

/**
 * Convenience hooks for specific use cases
 */
export const useCampaignImageHotLoading = (campaignId: string) => {
  return useImageHotLoading({
    tableName: 'campaigns',
    recordId: campaignId,
    imageField: 'background_image',
    fallbackImage: '/campaign-background-placeholder.png'
  });
};

export const useCharacterImageHotLoading = (characterId: string) => {
  return useImageHotLoading({
    tableName: 'characters',
    recordId: characterId,
    imageField: 'background_image',
    fallbackImage: '/character-background-placeholder.png'
  });
};