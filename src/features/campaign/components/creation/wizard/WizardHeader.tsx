import { Wand2, Sparkles, Crown } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAutosave } from '@/hooks/useAutosave';

type Props = {
  step?: number;
  totalSteps?: number;
  autosaveKey?: string;
  formSnapshot?: any;
};

/**
 * Header component for the campaign creation wizard
 * Matches the character creation wizard styling
 */
const WizardHeader: React.FC<Props> = ({
  step = 1,
  totalSteps = 4,
  autosaveKey = 'campaign-wizard-draft',
  formSnapshot = {},
}) => {
  const { status } = useAutosave(autosaveKey, formSnapshot, { delay: 900 });

  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold">Create Your Campaign</h1>
    </div>
  );
};

export default WizardHeader;
