import React from 'react';

import CampaignDescriptionInput from './components/CampaignDescriptionInput';
import CampaignNameInput from './components/CampaignNameInput';

import type { WizardStepProps } from '../../wizard/types';

import { Skeleton } from '@/components/ui/skeleton';
import { useCampaign } from '@/contexts/CampaignContext';

/**
 * Basic campaign details component
 * Handles campaign name and description input with validation
 * Includes AI-powered description generation capability
 * @param isLoading - Loading state from parent component
 */
const BasicDetails: React.FC<WizardStepProps> = ({ isLoading = false }) => {
  const { state, dispatch } = useCampaign();
  const [touched, setTouched] = React.useState({
    name: false,
    description: false,
  });

  /**
   * Updates campaign state with new field values
   * @param field - Field name to update
   * @param value - New value for the field
   */
  const handleChange = (field: string, value: string) => {
    dispatch({
      type: 'UPDATE_CAMPAIGN',
      payload: { [field]: value },
    });
  };

  /**
   * Marks a field as touched for validation purposes
   * @param field - Field name to mark as touched
   */
  const handleBlur = (field: string) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  /**
   * Gets validation error message for campaign name
   * @returns Error message if validation fails, empty string otherwise
   */
  const getNameError = () => {
    if (touched.name && (!state.campaign?.name || !state.campaign.name.trim())) {
      return 'Campaign name is required';
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CampaignNameInput
        value={state.campaign?.name || ''}
        onChange={(value) => handleChange('name', value)}
        onBlur={() => handleBlur('name')}
        error={getNameError()}
      />
      <CampaignDescriptionInput
        value={state.campaign?.description || ''}
        onChange={(value) => handleChange('description', value)}
        onBlur={() => handleBlur('description')}
        campaignParams={{
          genre: state.campaign?.genre,
          difficulty_level: state.campaign?.difficulty_level,
          campaign_length: state.campaign?.campaign_length,
          tone: state.campaign?.tone,
        }}
      />
    </div>
  );
};

export default BasicDetails;
