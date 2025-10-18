const DEFAULT_SITE_URL = 'https://infinite-realms.ai';
const DEFAULT_SITE_NAME = 'Infinite Realms';
const DEFAULT_SITE_TAGLINE = 'Solo fantasy RPG platform with multi-agent AI storytelling and persistent worlds.';
const DEFAULT_TWITTER_HANDLE = '@InfiniteRealmsAI';
const DEFAULT_LOGO_PATH = '/branding/logo.png';
const DEFAULT_OG_IMAGE_PATH = '/branding/og-image.png';

export interface SiteConfig {
  url: string;
  name: string;
  description: string;
  twitterHandle: string;
  logoUrl: string;
  defaultSocialImageUrl: string;
  softwareApplication: {
    name: string;
    applicationCategory: string;
    operatingSystem: string;
    offers: {
      price: string;
      priceCurrency: string;
    };
  };
}

export function getSiteConfig(): SiteConfig {
  const rawUrl = process.env.SITE_URL?.trim();
  const url = normalizeSiteUrl(rawUrl || DEFAULT_SITE_URL);
  const name = process.env.SITE_NAME?.trim() || DEFAULT_SITE_NAME;
  const description = process.env.SITE_DESCRIPTION?.trim() || DEFAULT_SITE_TAGLINE;
  const twitterHandle = process.env.SITE_TWITTER?.trim() || DEFAULT_TWITTER_HANDLE;
  const logoOverride = process.env.SITE_LOGO_URL?.trim();
  const socialOverride = process.env.SITE_SOCIAL_IMAGE_URL?.trim();

  return {
    url,
    name,
    description,
    twitterHandle,
    logoUrl: logoOverride || `${url}${DEFAULT_LOGO_PATH}`,
    defaultSocialImageUrl: socialOverride || `${url}${DEFAULT_OG_IMAGE_PATH}`,
    softwareApplication: {
      name,
      applicationCategory: 'Game',
      operatingSystem: 'Web',
      offers: {
        price: '0',
        priceCurrency: 'USD',
      },
    },
  };
}

function normalizeSiteUrl(url: string): string {
  const trimmed = url.replace(/\/$/, '');
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}
