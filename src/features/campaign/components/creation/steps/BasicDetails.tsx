import { Loader2, Wand2, BookOpen, Sparkles, AlertCircle } from 'lucide-react';
import React from 'react';

import type { WizardStepProps } from '../wizard/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useCampaign } from '@/contexts/CampaignContext';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

/**
 * Basic campaign details component
 * Handles campaign name and description input with validation
 */
const BasicDetails: React.FC<WizardStepProps> = ({ isLoading = false }) => {
  const { state, dispatch } = useCampaign();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [touched, setTouched] = React.useState({
    name: false,
    description: false,
  });

  const handleChange = (field: string, value: string) => {
    dispatch({
      type: 'UPDATE_CAMPAIGN',
      payload: { [field]: value },
    });
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const getNameError = () => {
    if (touched.name && (!state.campaign?.name || !state.campaign.name.trim())) {
      return 'Campaign name is required';
    }
    return '';
  };

  const generateDescription = async () => {
    if (
      !state.campaign?.genre ||
      !state.campaign?.difficulty_level ||
      !state.campaign?.campaign_length ||
      !state.campaign?.tone
    ) {
      toast({
        title: 'Missing Information',
        description: 'Please complete the genre and parameters steps first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-description', {
        body: {
          genre: state.campaign.genre,
          difficulty: state.campaign.difficulty_level,
          length: state.campaign.campaign_length,
          tone: state.campaign.tone,
        },
      });

      if (error) throw error;

      handleChange('description', data.description);
      toast({
        title: 'Success',
        description: 'Campaign description generated successfully!',
      });
    } catch (error) {
      logger.error('Error generating description:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate campaign description. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const nameError = getNameError();

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
    <div className="space-y-8 parchment animate-fade-in-up">
      <div className="space-y-3">
        <Label htmlFor="name" className="flex items-center text-lg font-medium">
          <Wand2 className="h-4 w-4 mr-2 text-infinite-gold" />
          Campaign Name
          <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          id="name"
          value={state.campaign?.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          placeholder="Enter a legendary name for your campaign..."
          className={`h-12 px-4 py-3 border-2 transition-all duration-200 ease-in-out focus:ring-2 focus:ring-infinite-gold/30 focus:border-infinite-gold bg-white/80 backdrop-blur-sm ${nameError ? 'border-destructive focus:border-destructive ring-destructive/30' : 'border-amber-200 hover:border-amber-300'}`}
        />
        {nameError && (
          <p className="text-sm text-destructive mt-1 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {nameError}
          </p>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label htmlFor="description" className="text-lg font-medium flex items-center">
            <BookOpen className="h-4 w-4 mr-2 text-infinite-teal" />
            Campaign Description
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateDescription}
            disabled={isGenerating}
            className="choice-btn primary animate-shimmer hover:animate-pulse transition-all duration-200 border-infinite-gold text-infinite-gold hover:bg-infinite-gold/10"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Description
              </>
            )}
          </Button>
        </div>
        <Textarea
          id="description"
          value={state.campaign?.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder="Describe the epic tale of your campaign, its mysteries, and adventures..."
          className="h-40 px-4 py-3 border-2 transition-all duration-200 ease-in-out focus:ring-2 focus:ring-infinite-purple/30 focus:border-infinite-purple bg-white/80 backdrop-blur-sm border-amber-200 hover:border-amber-300 resize-none font-serif text-base leading-relaxed"
          rows={5}
        />
      </div>
    </div>
  );
};

export default BasicDetails;
