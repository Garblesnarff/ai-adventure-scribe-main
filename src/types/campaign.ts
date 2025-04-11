/**
 * Interface for campaign setting details
 */
export interface CampaignSetting {
  era: string;              // e.g., "1920s", "medieval", "future"
  location: string;         // e.g., "Ravenswood", "New Erebo"
  atmosphere: string;       // e.g., "horror", "high fantasy"
}

/**
 * Interface for campaign thematic elements
 */
export interface ThematicElements {
  mainThemes: string[];     // e.g., ["reflection", "madness"]
  recurringMotifs: string[];// e.g., ["mirrors", "shadows"]
  keyLocations: string[];   // e.g., ["Blackstone Mansion"]
  importantNPCs: string[];  // e.g., ["Edward Blackstone"]
}

/**
 * Interface for complete campaign data
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
  created_at?: string;
  updated_at?: string;
}