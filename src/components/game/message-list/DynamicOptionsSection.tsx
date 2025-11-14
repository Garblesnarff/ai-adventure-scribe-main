import React from 'react';

import { ActionOptions } from '@/components/game/ActionOptions';
import { createPlayerMessageFromOption } from '@/utils/parseMessageOptions';

interface DynamicOptionsSectionProps {
  options: string[];
  onOptionSelect: (optionText: string) => Promise<void>;
  hasDynamicOverlay: boolean;
}

/**
 * DynamicOptionsSection Component
 * Displays AI-generated action suggestions from /dm/options endpoint
 * Shows after DYNAMIC_OPTIONS_FETCH_DELAY_MS if no inline options present
 */
export const DynamicOptionsSection: React.FC<DynamicOptionsSectionProps> = ({
  options,
  onOptionSelect,
  hasDynamicOverlay,
}) => {
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-md mt-3">
      <ActionOptions
        options={options}
        onOptionSelect={(option) => onOptionSelect(createPlayerMessageFromOption(option))}
        delay={hasDynamicOverlay ? 0 : 10000}
      />
    </div>
  );
};
