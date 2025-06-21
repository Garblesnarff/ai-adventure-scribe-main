export interface SubscriptionTier {
  id: string; // Corresponds to tier_id in the backend, or a local identifier
  name: string; // e.g., "Free", "Adventurer", "Dungeon Master"
  price: string; // e.g., "$0", "$9.99/month", "$19.99/month"
  priceAmount?: number; // For sorting or calculations, e.g., 0, 9.99, 19.99
  stripePriceId: string; // Actual Stripe Price ID
  messageLimit: string; // e.g., "20 messages/day", "Unlimited messages"
  features: string[];
  description?: string; // A short description of the tier
  isCurrent?: boolean; // Optional: to highlight the user's current plan
  isPopular?: boolean; // Optional: to highlight a plan
}

export interface UserSubscription {
  tier_name: string;
  status: string; // 'active', 'trialing', 'past_due', 'canceled', etc.
  message_limit: number | null; // null for unlimited
  features: Record<string, boolean>; // Parsed from JSONB, e.g., {"voice_features": true}
  current_period_end: string; // ISO date string
  stripe_customer_id?: string; // Needed for customer portal
  stripe_subscription_id?: string; // Stripe subscription ID
  tier_id?: string; // UUID of the tier
}

export interface UsageDetails {
  date: string; // YYYY-MM-DD
  message_count: number;
  // other usage metrics can be added here
}

// Example structure for features in subscription_tiers features JSONB
// '{"voice_features": boolean, "single_campaign": boolean, "multiple_characters_per_campaign": boolean, ...}'
export interface TierFeatureConfig {
  voice_features: boolean;
  single_campaign?: boolean; // Only for Free tier, others allow multiple implicitly or explicitly
  multiple_campaigns?: boolean; // For DM tier
  multiple_characters_per_campaign: boolean;
  basic_character_creation: boolean;
  advanced_customization: boolean;
  gm_tools: boolean;
  api_access: boolean;
}
