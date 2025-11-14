import { useMutation, useQuery } from '@tanstack/react-query';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import CharacterWizard from '@/components/character-creation/character-wizard';
import { ErrorBoundary } from '@/components/error';
import { CharacterCreationErrorFallback } from '@/components/error/CharacterCreationErrorFallback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isCampaignCharacterFlowEnabled } from '@/config/featureFlags';
import { supabase } from '@/integrations/supabase/client';

type CampaignTemplate = {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  tone: string | null;
  campaign_length: string | null;
  difficulty_level: string | null;
  thumbnail_url: string | null;
};

const CharacterCreateEntry: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const featureOn = isCampaignCharacterFlowEnabled();
  const preselectedCampaign = searchParams.get('campaign');

  React.useEffect(() => {
    if (featureOn && preselectedCampaign) {
      navigate(`/app/campaigns/${preselectedCampaign}/characters/new`, { replace: true });
    }
  }, [featureOn, preselectedCampaign, navigate]);

  // Always call hook regardless of feature flag (rules of hooks requirement)
  // Feature enabled and campaign picker: show campaigns
  // Feature disabled: don't use this data
  const [activeTemplateId, setActiveTemplateId] = React.useState<string | null>(null);
  const [cloneError, setCloneError] = React.useState<string | null>(null);

  const {
    data: templates,
    isLoading,
    isError,
    error,
  } = useQuery<CampaignTemplate[], Error>({
    queryKey: ['public-campaign-templates'],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('campaigns')
        .select(
          'id, name, description, genre, tone, campaign_length, difficulty_level, thumbnail_url',
        )
        .eq('template', true)
        .eq('visibility', 'public')
        .order('published_at', { ascending: false, nullsLast: false })
        .order('template_version', { ascending: false })
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      return (data ?? []) as CampaignTemplate[];
    },
    enabled: featureOn, // Only run query if feature is enabled
  });

  const cloneMutation = useMutation<string, Error, string>({
    mutationFn: async (templateId: string) => {
      const { data, error: fnError } = await supabase.functions.invoke('clone-template', {
        body: { templateId },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to clone template');
      }

      const campaignId = (data as { campaignId?: string } | null)?.campaignId;
      if (!campaignId) {
        throw new Error('Clone response missing campaignId');
      }

      return campaignId;
    },
    onMutate: (templateId) => {
      setCloneError(null);
      setActiveTemplateId(templateId);
    },
    onSuccess: (campaignId) => {
      navigate(`/app/campaigns/${campaignId}/characters/new`);
    },
    onError: (err) => {
      setCloneError(err.message || 'Failed to clone template');
    },
    onSettled: () => {
      setActiveTemplateId(null);
    },
  });

  const handleSelect = React.useCallback(
    (templateId: string) => {
      if (cloneMutation.isPending) return;
      cloneMutation.mutate(templateId);
    },
    [cloneMutation],
  );

  // Legacy behavior: render wizard directly
  // CharacterWizard is already wrapped with ErrorBoundary internally
  if (!featureOn) {
    return <CharacterWizard />;
  }

  // Wrap campaign selection UI with ErrorBoundary for campaign template loading errors
  return (
    <ErrorBoundary
      level="feature"
      fallback={<CharacterCreationErrorFallback showReturnToCharacters />}
    >
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold mb-2">Choose a Campaign</h1>
          <p className="text-muted-foreground mb-4">Select a campaign to create a character for.</p>
          {cloneError && <div className="mb-4 text-sm text-destructive">{cloneError}</div>}
          {isError ? (
            <div className="text-sm text-destructive">
              Failed to load campaigns: {error?.message}
            </div>
          ) : isLoading ? (
            <div>Loading campaigns…</div>
          ) : templates && templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => {
                const isCloning = cloneMutation.isPending && activeTemplateId === template.id;
                return (
                  <Card key={template.id} className="p-4 flex flex-col gap-3">
                    <div className="space-y-1">
                      <div className="font-medium text-lg">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground line-clamp-3">
                          {template.description}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[
                        template.genre && `Genre: ${template.genre}`,
                        template.tone && `Tone: ${template.tone}`,
                        template.difficulty_level && `Difficulty: ${template.difficulty_level}`,
                        template.campaign_length && `Length: ${template.campaign_length}`,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </div>
                    <div className="mt-auto flex justify-end">
                      <Button onClick={() => handleSelect(template.id)} disabled={isCloning}>
                        {isCloning ? 'Cloning…' : 'Select'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div>No campaigns found.</div>
          )}
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default CharacterCreateEntry;
