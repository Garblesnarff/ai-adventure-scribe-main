import { CampaignContextProvider } from './CampaignContextProvider';

const DEFAULT_TTL = 60_000; // 1 minute cache window

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CachedCampaignContextProvider {
  private inner: CampaignContextProvider;
  private cache = new Map<string, CacheEntry<any>>();
  private ttl: number;

  constructor(
    ttl: number = DEFAULT_TTL,
    provider: CampaignContextProvider = new CampaignContextProvider(),
  ) {
    this.ttl = ttl;
    this.inner = provider;
  }

  public async fetchCampaignDetails(campaignId: string) {
    if (!campaignId) return null;
    const cached = this.cache.get(campaignId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const value = await this.inner.fetchCampaignDetails(campaignId);
    if (value) {
      this.cache.set(campaignId, {
        value,
        expiresAt: Date.now() + this.ttl,
      });
    }
    return value;
  }

  public invalidate(campaignId?: string): void {
    if (campaignId) {
      this.cache.delete(campaignId);
      return;
    }
    this.cache.clear();
  }
}
