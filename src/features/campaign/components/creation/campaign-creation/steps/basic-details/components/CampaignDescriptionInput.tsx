import React from 'react';

import DescriptionGeneratorButton from './DescriptionGeneratorButton';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CampaignDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  campaignParams: {
    genre?: string;
    difficulty_level?: string;
    campaign_length?: string;
    tone?: string;
  };
}

/**
 * Campaign description input component with AI generation capability
 * @param value - Current description value
 * @param onChange - Handler for description changes
 * @param onBlur - Handler for input blur events
 * @param campaignParams - Campaign parameters for AI generation
 */
const CampaignDescriptionInput: React.FC<CampaignDescriptionInputProps> = ({
  value,
  onChange,
  onBlur,
  campaignParams,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label htmlFor="description">Campaign Description</Label>
        <DescriptionGeneratorButton
          isDisabled={false}
          campaignParams={campaignParams}
          onGenerate={onChange}
        />
      </div>
      <Textarea
        id="description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Describe your campaign"
        className="h-32"
      />
    </div>
  );
};

export default CampaignDescriptionInput;
