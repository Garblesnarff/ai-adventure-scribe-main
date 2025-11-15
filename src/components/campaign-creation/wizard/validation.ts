/**
 * Validates the basic details step of campaign creation
 * @param campaign - The campaign data to validate
 * @param toast - Toast function for displaying validation messages
 * @returns boolean indicating if validation passed
 */
export const validateBasicDetails = (campaign: any, toast: any): boolean => {
  if (!campaign?.name?.trim()) {
    toast({
      title: 'Missing Campaign Name',
      description: 'Please enter a name for your campaign.',
      variant: 'destructive',
    });
    return false;
  }
  return true;
};

/**
 * Validates the genre selection step
 * @param campaign - The campaign data to validate
 * @param toast - Toast function for displaying validation messages
 * @returns boolean indicating if validation passed
 */
export const validateGenreSelection = (campaign: any, toast: any): boolean => {
  if (!campaign?.genre) {
    toast({
      title: 'Missing Genre',
      description: 'Please select a genre for your campaign.',
      variant: 'destructive',
    });
    return false;
  }
  return true;
};

/**
 * Validates campaign parameters step
 * @param campaign - The campaign data to validate
 * @param toast - Toast function for displaying validation messages
 * @returns boolean indicating if validation passed
 */
export const validateCampaignParameters = (campaign: any, toast: any): boolean => {
  const requiredFields = {
    difficulty_level: 'Difficulty Level',
    campaign_length: 'Campaign Length',
    tone: 'Campaign Tone',
  };

  for (const [field, label] of Object.entries(requiredFields)) {
    if (!campaign?.[field]) {
      toast({
        title: `Missing ${label}`,
        description: `Please select a ${label.toLowerCase()} for your campaign.`,
        variant: 'destructive',
      });
      return false;
    }
  }
  return true;
};

/**
 * Validates the campaign enhancements step
 * @param campaign - The campaign data to validate
 * @param toast - Toast function for displaying validation messages
 * @returns boolean indicating if validation passed
 */
export const validateCampaignEnhancements = (campaign: any, toast: any): boolean => {
  // Enhancements are optional, so this step always passes validation
  // Users can skip enhancements or select any number they want
  return true;
};

/**
 * Validates the complete campaign data in the correct order:
 * 1. Genre
 * 2. Parameters
 * 3. Basic Details
 * @param campaign - The campaign data to validate
 * @param toast - Toast function for displaying validation messages
 * @returns boolean indicating if validation passed
 */
export const validateCompleteCampaign = (campaign: any, toast: any): boolean => {
  if (!campaign) {
    toast({
      title: 'Missing Campaign Data',
      description: 'Campaign data is incomplete. Please fill in all required fields.',
      variant: 'destructive',
    });
    return false;
  }

  // Validate in the same order as the wizard steps
  if (!validateGenreSelection(campaign, toast)) return false;
  if (!validateCampaignParameters(campaign, toast)) return false;
  if (!validateBasicDetails(campaign, toast)) return false;

  return true;
};
