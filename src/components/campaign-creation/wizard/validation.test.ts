import { vi } from 'vitest';

import {
  validateBasicDetails,
  validateGenreSelection,
  validateCampaignParameters,
  validateCompleteCampaign,
} from './validation';

import type { Campaign } from '@/types/campaign'; // Assuming Campaign type is available

// Mock toast function
const mockToast = vi.fn();

describe('Campaign Validation Functions', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  describe('validateBasicDetails', () => {
    it('should return true if campaign name is provided', () => {
      const campaign = { name: 'My Awesome Campaign' } as Partial<Campaign>;
      expect(validateBasicDetails(campaign, mockToast)).toBe(true);
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should return false and call toast if campaign name is missing', () => {
      const campaign = { name: '' } as Partial<Campaign>;
      expect(validateBasicDetails(campaign, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Campaign Name',
        description: 'Please enter a name for your campaign.',
        variant: 'destructive',
      });
    });

    it('should return false and call toast if campaign name is only whitespace', () => {
      const campaign = { name: '   ' } as Partial<Campaign>;
      expect(validateBasicDetails(campaign, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Campaign Name',
        description: 'Please enter a name for your campaign.',
        variant: 'destructive',
      });
    });

    it('should return false and call toast if campaign object itself is missing', () => {
      expect(validateBasicDetails(null, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Campaign Name',
        description: 'Please enter a name for your campaign.',
        variant: 'destructive',
      });
    });
  });

  describe('validateGenreSelection', () => {
    it('should return true if genre is provided', () => {
      const campaign = { genre: 'Fantasy' } as Partial<Campaign>;
      expect(validateGenreSelection(campaign, mockToast)).toBe(true);
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should return false and call toast if genre is missing', () => {
      const campaign = {} as Partial<Campaign>; // No genre
      expect(validateGenreSelection(campaign, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Genre',
        description: 'Please select a genre for your campaign.',
        variant: 'destructive',
      });
    });

    it('should return false and call toast if genre is empty string', () => {
      const campaign = { genre: '' } as Partial<Campaign>;
      expect(validateGenreSelection(campaign, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Genre',
        description: 'Please select a genre for your campaign.',
        variant: 'destructive',
      });
    });

    it('should return false and call toast if campaign object itself is missing', () => {
      expect(validateGenreSelection(null, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Genre',
        description: 'Please select a genre for your campaign.',
        variant: 'destructive',
      });
    });
  });

  describe('validateCampaignParameters', () => {
    // Parameters are expected directly on the campaign object by the validation function
    const validCampaignWithParams = {
      difficulty_level: 'Easy',
      campaign_length: 'Short',
      tone: 'Serious',
    } as Partial<Campaign>;

    it('should return true if all parameters are provided', () => {
      expect(validateCampaignParameters(validCampaignWithParams, mockToast)).toBe(true);
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should return false and call toast if campaign object itself is missing parameters', () => {
      const campaign = {} as Partial<Campaign>; // No parameters
      expect(validateCampaignParameters(campaign, mockToast)).toBe(false);
      // It will call toast for the first missing parameter it checks (difficulty_level)
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Difficulty Level',
        description: 'Please select a difficulty level for your campaign.',
        variant: 'destructive',
      });
    });

    it('should return false and call toast if campaign object is null', () => {
      expect(validateCampaignParameters(null, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Difficulty Level',
        description: 'Please select a difficulty level for your campaign.',
        variant: 'destructive',
      });
    });

    const fields: Array<{
      key: keyof Pick<Campaign, 'difficulty_level' | 'campaign_length' | 'tone'>;
      title: string;
      description: string;
      validPrevious: Partial<Campaign>;
    }> = [
      {
        key: 'difficulty_level',
        title: 'Missing Difficulty Level',
        description: 'Please select a difficulty level for your campaign.',
        validPrevious: {},
      },
      {
        key: 'campaign_length',
        title: 'Missing Campaign Length',
        description: 'Please select a campaign length for your campaign.',
        validPrevious: { difficulty_level: 'Easy' },
      },
      {
        key: 'tone',
        title: 'Missing Campaign Tone', // Corrected title
        description: 'Please select a campaign tone for your campaign.',
        validPrevious: { difficulty_level: 'Easy', campaign_length: 'Short' },
      },
    ];

    fields.forEach((field) => {
      it(`should return false and call toast if ${field.key} is missing`, () => {
        // Create a campaign object that is valid up to the point of the field being tested
        const campaignToTest = { ...field.validPrevious };
        // The field itself is missing.
        expect(validateCampaignParameters(campaignToTest, mockToast)).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({
          title: field.title,
          description: field.description,
          variant: 'destructive',
        });
      });
    });
  });

  describe('validateCompleteCampaign', () => {
    // Adjusted fullValidCampaign to have parameters at the top level
    const fullValidCampaign: Campaign = {
      id: 'test-id',
      user_id: 'user-123',
      name: 'Test Campaign Alpha',
      description: 'A test campaign.',
      genre: 'Sci-Fi',
      // Parameters now at top level
      difficulty_level: 'Medium',
      campaign_length: 'Medium',
      tone: 'Epic',
      setting: {
        // Other settings can remain nested if not validated by these specific functions
        custom_rules: 'None',
        player_level: 1,
        starting_gold: 100,
        monster_variety: 'Standard',
        encounter_frequency: 'Normal',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'Draft',
      world_anvil_id: null,
    };

    it('should return false and call toast if campaign data is null', () => {
      expect(validateCompleteCampaign(null, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Campaign Data', // Corrected title
        description: 'Campaign data is incomplete. Please fill in all required fields.', // Corrected description
        variant: 'destructive',
      });
    });

    it('should return false and call toast if campaign data is undefined', () => {
      expect(validateCompleteCampaign(undefined, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Campaign Data', // Corrected title
        description: 'Campaign data is incomplete. Please fill in all required fields.', // Corrected description
        variant: 'destructive',
      });
    });

    it('should return false if validateGenreSelection fails', () => {
      const campaign = { ...fullValidCampaign, genre: '' };
      expect(validateCompleteCampaign(campaign, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Genre',
        description: 'Please select a genre for your campaign.',
        variant: 'destructive',
      });
    });

    it('should return false if validateCampaignParameters fails', () => {
      // Ensure genre is valid, but a required campaign parameter (now top-level) is missing
      const campaign = { ...fullValidCampaign, difficulty_level: '' };
      expect(validateCompleteCampaign(campaign, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Difficulty Level',
        description: 'Please select a difficulty level for your campaign.',
        variant: 'destructive',
      });
    });

    it('should return false if validateBasicDetails fails', () => {
      // Ensure genre and campaign parameters (top-level) are valid, but name is missing
      const campaign = { ...fullValidCampaign, name: '' };
      expect(validateCompleteCampaign(campaign, mockToast)).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Missing Campaign Name',
        description: 'Please enter a name for your campaign.',
        variant: 'destructive',
      });
    });

    it('should return true if all nested validations pass', () => {
      expect(validateCompleteCampaign(fullValidCampaign, mockToast)).toBe(true);
      expect(mockToast).not.toHaveBeenCalled();
    });
  });
});
