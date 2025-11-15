import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CampaignNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
}

/**
 * Campaign name input component with validation
 * @param value - Current campaign name value
 * @param onChange - Handler for name changes
 * @param onBlur - Handler for input blur events
 * @param error - Error message to display if validation fails
 */
const CampaignNameInput: React.FC<CampaignNameInputProps> = ({
  value,
  onChange,
  onBlur,
  error,
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="name" className="flex items-center">
        Campaign Name
        <span className="text-destructive ml-1">*</span>
      </Label>
      <Input
        id="name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Enter campaign name"
        className={error ? 'border-destructive' : ''}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
};

export default CampaignNameInput;
