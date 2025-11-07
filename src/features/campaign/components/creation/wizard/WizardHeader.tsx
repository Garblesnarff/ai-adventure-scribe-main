import React from 'react';
import { Wand2, Sparkles, Crown } from 'lucide-react';
import { useAutosave } from '@/hooks/useAutosave';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';

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
const WizardHeader: React.FC<Props> = ({ step = 1, totalSteps = 4, autosaveKey = 'campaign-wizard-draft', formSnapshot = {} }) => {
  const { status } = useAutosave(autosaveKey, formSnapshot, { delay: 900 });

  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold">Create Your Campaign</h1>
    </div>
  );
};

export default WizardHeader;
