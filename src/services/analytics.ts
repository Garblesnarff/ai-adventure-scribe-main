import { featureFlags } from '@/config/featureFlags';
import { logger } from '@/lib/logger';

// Minimal type for analytics payloads
export type AnalyticsPayload = Record<string, any>;

// Utility to safely access window-bound analytics without failing in SSR/tests
function getGlobal(): any {
  return typeof window !== 'undefined' ? (window as any) : {};
}

function basePayload(extra?: AnalyticsPayload): AnalyticsPayload {
  const flags = { ...featureFlags };
  return {
    timestamp: new Date().toISOString(),
    featureFlags: flags,
    ...extra,
  };
}

function detectArtStyle(input?: {
  characterTheme?: string | null | undefined;
  campaignGenre?: string | null | undefined;
}): string {
  if (!input) return 'unknown';
  if (input.characterTheme && String(input.characterTheme).trim())
    return String(input.characterTheme);
  if (input.campaignGenre && String(input.campaignGenre).trim()) return String(input.campaignGenre);
  return 'unknown';
}

export const analytics = {
  track(event: string, payload?: AnalyticsPayload): void {
    const data = basePayload(payload);
    const g = getGlobal();

    try {
      if (g.gtag && typeof g.gtag === 'function') {
        g.gtag('event', event, data);
      }
    } catch {
      // Ignore gtag errors
    }

    try {
      if (g.posthog && typeof g.posthog.capture === 'function') {
        g.posthog.capture(event, data);
      }
    } catch {
      // Ignore posthog errors
    }
  },

  campaignTabViewed(tab: string, info: { campaignId?: string; artStyle?: string } = {}): void {
    this.track('campaign_hub_tab_viewed', {
      tab,
      campaignId: info.campaignId || 'unknown',
      art_style: info.artStyle || 'unknown',
    });
  },

  characterCreationStarted(info: { campaignId?: string; artStyle?: string } = {}): void {
    this.track('campaign_character_creation_started', {
      campaignId: info.campaignId || 'unknown',
      art_style: info.artStyle || 'unknown',
    });
  },

  characterCreationCompleted(info: { campaignId?: string; artStyle?: string } = {}): void {
    this.track('campaign_character_creation_completed', {
      campaignId: info.campaignId || 'unknown',
      art_style: info.artStyle || 'unknown',
    });
  },

  aiRegenerateClicked(
    kind: 'description' | 'avatar' | 'design_sheet',
    info: { campaignId?: string; artStyle?: string } = {},
  ): void {
    this.track('ai_regenerate_clicked', {
      kind,
      campaignId: info.campaignId || 'unknown',
      art_style: info.artStyle || 'unknown',
    });
  },

  /**
   * Track which character creation flow is being used
   * @param flow - 'legacy' for direct character creation, 'new' for campaign-based flow
   * @param info - Additional context (campaignId, userId)
   */
  async trackCharacterCreationFlow(
    flow: 'legacy' | 'new',
    info: { campaignId?: string; userId?: string } = {},
  ): Promise<void> {
    // Track to analytics providers
    this.track('character_creation_flow', {
      flow,
      campaignId: info.campaignId || 'none',
      timestamp: new Date().toISOString(),
    });

    // Track to database for metrics (client-side call)
    try {
      // Import supabase client dynamically to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');

      await supabase.from('character_creation_metrics').insert({
        flow,
        campaign_id: info.campaignId || null,
        user_id: info.userId || null,
      });
    } catch (error) {
      // Silently fail - analytics should not break the app
      logger.warn('Failed to track character creation flow to database', { error });
    }
  },

  detectArtStyle,
};
