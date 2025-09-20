import React from 'react';
import { Wand2, Sparkles, Crown } from 'lucide-react';
import { useAutosave } from '@/hooks/useAutosave';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type Props = {
  step?: number;
  totalSteps?: number;
  autosaveKey?: string;
  formSnapshot?: any;
};

/**
 * Enhanced header component for the campaign creation wizard
 * Features improved visual hierarchy, animations, and fantasy-themed styling
 */
const WizardHeader: React.FC<Props> = ({ step = 1, totalSteps = 4, autosaveKey = 'campaign-wizard-draft', formSnapshot = {} }) => {
  const { status } = useAutosave(autosaveKey, formSnapshot, { delay: 900 });

  return (
    <div className="text-center mb-8 animate-fade-in-up">
      {/* Main Header */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-pulse">
            <Wand2 className="h-10 w-10 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-infinite-purple to-infinite-teal rounded-full flex items-center justify-center border-2 border-white shadow-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        </div>

        <div className="ml-6">
          <h1 className="text-4xl md:text-5xl font-serif font-bold bg-gradient-to-r from-infinite-purple via-infinite-teal to-infinite-gold bg-clip-text text-transparent tracking-tight" data-testid="wizard-header">
            Create Your Campaign
          </h1>
          <div className="flex items-center justify-center mt-2 space-x-2">
            <Badge variant="outline" className="px-3 py-1 border-infinite-gold text-infinite-gold">
              Step {step} of {totalSteps}
            </Badge>
            <Crown className="w-4 h-4 text-infinite-gold" />
          </div>
        </div>
      </div>

      {/* Subtitle */}
      <Card className="p-4 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800 max-w-2xl mx-auto">
        <p className="text-lg text-muted-foreground">
          Embark on an epic adventure and weave your legendary tale
        </p>
        <div className="flex items-center justify-center mt-3 space-x-4 text-sm text-infinite-purple">
          <div className="flex items-center space-x-1">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered</span>
          </div>
          <div className="flex items-center space-x-1">
            <Crown className="w-4 h-4" />
            <span>Fantasy Theme</span>
          </div>
          <div className="flex items-center space-x-1">
            <Wand2 className="w-4 h-4" />
            <span>Auto-Save</span>
          </div>
        </div>
      </Card>

      {/* Autosave Status */}
      <div className="mt-4">
        <span aria-live="polite" className={`text-xs px-2 py-1 rounded-full transition-all duration-300 ${
          status === 'saving'
            ? 'text-warning bg-warning dark:bg-warning/80'
            : status === 'saved'
            ? 'text-success bg-success dark:bg-success/80'
            : status === 'error'
            ? 'text-error bg-error dark:bg-error/80'
            : 'text-muted-foreground'
        }`}>
          {status === 'saving' && '✨ Autosaving your epic tale...'}
          {status === 'saved' && '✓ Draft saved successfully'}
          {status === 'error' && '⚠️ Autosave failed - check your connection'}
          {!status && '💾 Your progress is automatically saved'}
        </span>
      </div>
    </div>
  );
};

export default WizardHeader;
