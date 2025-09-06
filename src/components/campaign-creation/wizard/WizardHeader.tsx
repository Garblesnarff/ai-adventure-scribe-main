import React from 'react';
import { Wand2 } from 'lucide-react';

/**
 * Header component for the campaign creation wizard
 * Displays the main title with fantasy styling
 * 
 * Dependencies:
 * - lucide-react (Wand2 icon)
 */
const WizardHeader: React.FC = () => {
  return (
    <div className="text-center mb-8 animate-fade-in-up">
      <div className="flex items-center justify-center mb-4">
        <Wand2 className="h-12 w-12 text-infinite-purple mr-3 animate-pulse" />
        <h1 className="text-4xl md:text-5xl font-serif font-bold gradient-text tracking-tight" data-testid="wizard-header">
          Create Your Campaign
        </h1>
      </div>
      <p className="text-lg text-muted-foreground max-w-md mx-auto">
        Embark on an epic adventure and weave your legendary tale
      </p>
    </div>
  );
};

export default WizardHeader;
