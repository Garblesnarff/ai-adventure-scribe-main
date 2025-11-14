/**
 * Campaign Enhancements Step
 *
 * Allows users to select enhancement options that make their campaign
 * more interesting and unique during the campaign creation process.
 */

import { Sparkles, Info, CheckCircle, Globe } from 'lucide-react';
import React from 'react';

import type { OptionSelection } from '@/types/enhancement-options';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancementPanel } from '@/components/ui/enhancement-panel';
import { Separator } from '@/components/ui/separator';
import { useCampaign } from '@/contexts/CampaignContext';
import {
  EnhancementOption,
  CAMPAIGN_ENHANCEMENTS,
  checkOptionAvailability,
} from '@/types/enhancement-options';

interface CampaignEnhancementsProps {
  isOptional?: boolean;
}

export default function CampaignEnhancements({ isOptional = true }: CampaignEnhancementsProps) {
  const { state, dispatch } = useCampaign();
  const [selections, setSelections] = React.useState<OptionSelection[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Load existing selections from campaign data
  React.useEffect(() => {
    if (state.campaign?.enhancementSelections) {
      setSelections(state.campaign.enhancementSelections);
    }
  }, [state.campaign?.enhancementSelections]);

  // Update campaign data when selections change
  React.useEffect(() => {
    dispatch({
      type: 'UPDATE_CAMPAIGN',
      payload: { enhancementSelections: selections },
    });
  }, [selections, dispatch]);

  // Calculate enhancement effects and apply them to campaign
  React.useEffect(() => {
    if (selections.length === 0) return;

    const effects = {
      atmosphere: [] as string[],
      themes: [] as string[],
      hooks: [] as string[],
      worldLaws: [] as string[],
      npcs: [] as string[],
      locations: [] as string[],
    };

    selections.forEach((selection) => {
      const option = CAMPAIGN_ENHANCEMENTS.find((o) => o.id === selection.optionId);
      if (option?.campaignEffects) {
        const camp = option.campaignEffects;

        if (camp.atmosphere) effects.atmosphere.push(...camp.atmosphere);
        if (camp.themes) effects.themes.push(...camp.themes);
        if (camp.hooks) effects.hooks.push(...camp.hooks);
        if (camp.worldLaws) effects.worldLaws.push(...camp.worldLaws);
        if (camp.npcs) effects.npcs.push(...camp.npcs);
        if (camp.locations) effects.locations.push(...camp.locations);
      }
    });

    // Apply effects to campaign
    dispatch({
      type: 'UPDATE_CAMPAIGN',
      payload: { enhancementEffects: effects },
    });
  }, [selections, dispatch]);

  // Mock AI generation function for campaign mysteries
  const handleAIGenerate = async (optionId: string): Promise<string> => {
    setIsGenerating(true);

    try {
      // Simulate AI generation delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const option = CAMPAIGN_ENHANCEMENTS.find((o) => o.id === optionId);
      if (!option) throw new Error('Option not found');

      // Mock AI-generated content based on campaign
      const campaign = state.campaign;
      const campaignGenre = campaign?.genre || 'fantasy';
      const campaignTone = campaign?.tone || 'serious';

      const mockMysteries = [
        `In this ${campaignGenre} world, ancient ${campaignTone === 'serious' ? 'evil' : 'mischievous'} forces have begun awakening, but their true purpose remains hidden`,
        `A series of seemingly unconnected events across the realm all point to a ${campaignTone === 'gritty' ? 'dark conspiracy' : 'grand mystery'} involving the balance of magic itself`,
        `The ${campaignGenre === 'horror' ? 'nightmares' : 'dreams'} of the people have started manifesting in reality, but no one knows why or how to stop it`,
        `Ancient artifacts are appearing in random locations, each containing fragments of a larger truth about the world's ${campaignTone === 'humorous' ? 'absurd' : 'hidden'} history`,
        `Time itself seems to be fracturing in certain locations, creating ${campaignTone === 'serious' ? 'dangerous temporal anomalies' : 'whimsical chronological hiccups'}`,
      ];

      return mockMysteries[Math.floor(Math.random() * mockMysteries.length)];
    } finally {
      setIsGenerating(false);
    }
  };

  const getRecommendedOptions = () => {
    const campaign = state.campaign;
    if (!campaign) return [];

    return CAMPAIGN_ENHANCEMENTS.filter((option) => {
      // Recommend options based on campaign genre/tone
      if (campaign.genre === 'horror' && option.tags.includes('mystery')) return true;
      if (campaign.tone === 'serious' && option.tags.includes('plot')) return true;
      if (campaign.difficulty_level === 'hard' && option.tags.includes('politics')) return true;
      if (option.tags.includes('story') && selections.length < 2) return true;
      return false;
    }).slice(0, 3);
  };

  const getSelectionSummary = () => {
    if (selections.length === 0) return null;

    const categories = new Set(
      selections.map((s) => {
        const option = CAMPAIGN_ENHANCEMENTS.find((o) => o.id === s.optionId);
        return option?.tags[0] || 'other';
      }),
    );

    return Array.from(categories);
  };

  const recommended = getRecommendedOptions();
  const summary = getSelectionSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Campaign Enhancements
            {isOptional && <Badge variant="secondary">Optional</Badge>}
          </CardTitle>
          <CardDescription>
            Add unique elements, mysteries, and world features that make your campaign memorable and
            provide rich material for storytelling. These enhancements give you plot hooks,
            atmosphere, and mechanical elements to create an engaging experience.
          </CardDescription>
        </CardHeader>

        {summary && (
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">
                  {selections.length} enhancement{selections.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {summary.map((category) => (
                  <Badge key={category} variant="outline" className="capitalize">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recommendations */}
      {recommended.length > 0 && selections.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Recommended for your {state.campaign?.genre} campaign:</strong>{' '}
            {recommended.map((opt) => opt.name).join(', ')}. These enhancements complement your
            campaign theme and provide excellent story material.
          </AlertDescription>
        </Alert>
      )}

      {/* Enhancement Selection Panel */}
      <EnhancementPanel
        category="campaign"
        campaignData={state.campaign}
        selections={selections}
        onSelectionChange={setSelections}
        onAIGenerate={handleAIGenerate}
        className="w-full"
      />

      {/* Selection Summary */}
      {selections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Campaign's Identity</CardTitle>
            <CardDescription>
              Here's how your enhancements shape your campaign's atmosphere and story potential:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selections.map((selection) => {
              const option = CAMPAIGN_ENHANCEMENTS.find((o) => o.id === selection.optionId);
              if (!option) return null;

              return (
                <div key={selection.optionId} className="border-l-2 border-primary/20 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{option.icon}</span>
                    <span className="font-medium">{option.name}</span>
                    {selection.aiGenerated && (
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {Array.isArray(selection.value) ? (
                      <ul className="list-disc list-inside">
                        {(selection.value as string[]).map((value, index) => (
                          <li key={index}>{value}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{selection.value as string}</p>
                    )}
                    {selection.customValue && (
                      <p className="italic">Note: {selection.customValue}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* DM Guidance */}
            <div className="mt-4 p-3 bg-muted rounded-md">
              <h4 className="font-medium text-sm mb-2">For the Dungeon Master:</h4>
              <p className="text-sm text-muted-foreground">
                These enhancements provide story hooks, atmosphere cues, and mechanical
                considerations for your campaign. Use them as inspiration for sessions, plot
                development, and world-building.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skip Option */}
      {isOptional && selections.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Optional Step:</strong> You can skip enhancements and create a standard
            campaign, or add them later. However, selecting enhancements now will give you and your
            players a richer, more unique world to explore.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
