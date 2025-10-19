import { featureFlags } from '@/config/featureFlags';

// Minimal type for analytics payloads
export type AnalyticsPayload = Record<string, any>;

// Utility to safely access window-bound analytics without failing in SSR/tests
function getGlobal(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function detectArtStyle(input?: { characterTheme?: string | null | undefined; campaignGenre?: string | null | undefined }): string {
  if (!input) return 'unknown';
  if (input.characterTheme && String(input.characterTheme).trim()) return String(input.characterTheme);
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
    } catch (err) {
      // ignore analytics errors
    }

    try {
      if (g.posthog && typeof g.posthog.capture === 'function') {
        g.posthog.capture(event, data);
      }
    } catch (err) {
      // ignore analytics errors
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

  aiRegenerateClicked(kind: 'description' | 'avatar' | 'design_sheet', info: { campaignId?: string; artStyle?: string } = {}): void {
    this.track('ai_regenerate_clicked', {
      kind,
      campaignId: info.campaignId || 'unknown',
      art_style: info.artStyle || 'unknown',
    });
  },

  detectArtStyle,
};
