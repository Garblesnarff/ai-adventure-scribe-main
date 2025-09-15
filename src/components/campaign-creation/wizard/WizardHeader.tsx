import React from 'react';
import { Wand2 } from 'lucide-react';
import { useAutosave } from '@/hooks/useAutosave';

type Props = {
  step?: number;
  totalSteps?: number;
  autosaveKey?: string;
  formSnapshot?: any;
};

/**
 * Header component for the campaign creation wizard
 * Displays the main title with fantasy styling and shows a compact autosave indicator
 */
const WizardHeader: React.FC<Props> = ({ step = 1, totalSteps = 4, autosaveKey = 'campaign-wizard-draft', formSnapshot = {} }) => {
  const { status } = useAutosave(autosaveKey, formSnapshot, { delay: 900 });

  return (
    <div className="text-center mb-8 animate-fade-in-up">
      <div className="flex items-center justify-center mb-4">
        <Wand2 className="h-12 w-12 text-infinite-purple mr-3 animate-pulse" />
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold gradient-text tracking-tight" data-testid="wizard-header">
            Create Your Campaign
          </h1>
          <div className="text-sm text-muted-foreground mt-1">Step {step} / {totalSteps}</div>
        </div>
      </div>
      <p className="text-lg text-muted-foreground max-w-md mx-auto">
        Embark on an epic adventure and weave your legendary tale
      </p>

      <div className="mt-3">
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {status === 'saving' && 'Autosaving…'}
          {status === 'saved' && 'Draft saved'}
          {status === 'error' && 'Autosave failed'}
        </span>
      </div>
    </div>
  );
};

export default WizardHeader;
