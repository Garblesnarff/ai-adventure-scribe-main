/**
 * Interface for campaign setting details
 */
export interface CampaignSetting {
  era: string; // e.g., "1920s", "medieval", "future"
  location: string; // e.g., "Ravenswood", "New Erebo"
  atmosphere: string; // e.g., "horror", "high fantasy"
}

/**
 * Interface for campaign thematic elements
 */
export interface ThematicElements {
  mainThemes: string[]; // e.g., ["reflection", "madness"]
  recurringMotifs: string[]; // e.g., ["mirrors", "shadows"]
  keyLocations: string[]; // e.g., ["Blackstone Mansion"]
  importantNPCs: string[]; // e.g., ["Edward Blackstone"]
}

/**
 * Minimal campaign data for list views
 * Excludes heavy JSONB fields to reduce bandwidth
 */
export interface CampaignListItem {
  id: string;
  name: string;
  description?: string | null;
  genre?: string | null;
  difficulty_level?: string | null;
  campaign_length?: string | null;
  tone?: string | null;
  status?: string | null;
  background_image?: string | null;
  art_style?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Complete campaign data with all fields including JSONB
 * Used for detail/edit views where full data is needed
 */
export interface CampaignDetail extends CampaignListItem {
  era?: string | null;
  location?: string | null;
  atmosphere?: string | null;
  setting_details?: any; // JSONB - CampaignSetting
  thematic_elements?: any; // JSONB - ThematicElements
  style_config?: any; // JSONB - style configuration
  rules_config?: any; // JSONB - rules configuration
  user_id?: string | null;
}

/**
 * Interface for complete campaign data
 * @deprecated Use CampaignListItem for lists and CampaignDetail for full data
 */
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  difficulty_level?: string;
  campaign_length?: 'one-shot' | 'short' | 'full';
  tone?: 'serious' | 'humorous' | 'gritty';
  setting: CampaignSetting;
  thematic_elements: ThematicElements;
  status?: string;
  art_style?: string;
  style_config?: Record<string, any>;
  rules_config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}
