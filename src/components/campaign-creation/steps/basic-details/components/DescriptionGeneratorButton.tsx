import { Loader2, Wand2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

interface DescriptionGeneratorButtonProps {
  isDisabled: boolean;
  campaignParams: {
    genre?: string;
    difficulty_level?: string;
    campaign_length?: string;
    tone?: string;
  };
  onGenerate: (description: string) => void;
}

/**
 * AI-powered description generator button component
 * @param isDisabled - Whether the button should be disabled
 * @param campaignParams - Campaign parameters used for generation
 * @param onGenerate - Callback function when description is generated
 */
const DescriptionGeneratorButton: React.FC<DescriptionGeneratorButtonProps> = ({
  isDisabled,
  campaignParams,
  onGenerate,
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (
      !campaignParams.genre ||
      !campaignParams.difficulty_level ||
      !campaignParams.campaign_length ||
      !campaignParams.tone
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
          genre: campaignParams.genre,
          difficulty: campaignParams.difficulty_level,
          length: campaignParams.campaign_length,
          tone: campaignParams.tone,
        },
      });

      if (error) throw error;

      onGenerate(data.description);
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

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={isDisabled || isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Wand2 className="mr-2 h-4 w-4" />
          Generate Description
        </>
      )}
    </Button>
  );
};

export default DescriptionGeneratorButton;
