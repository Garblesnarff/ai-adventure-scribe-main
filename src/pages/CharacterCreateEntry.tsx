import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isCampaignCharacterFlowEnabled } from '@/config/featureFlags';
import CharacterWizard from '@/components/character-creation/character-wizard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['available-campaigns-for-create'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; name: string; description?: string | null }>;
    },
    enabled: featureOn, // Only run query if feature is enabled
  });

  // Legacy behavior: render wizard directly
  if (!featureOn) {
    return <CharacterWizard />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Choose a Campaign</h1>
        <p className="text-muted-foreground mb-4">Select a campaign to create a character for.</p>
        {isLoading ? (
          <div>Loading campaigns…</div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => (
              <Card key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  {c.description && <div className="text-sm text-muted-foreground line-clamp-2">{c.description}</div>}
                </div>
                <Button onClick={() => navigate(`/app/campaigns/${c.id}/characters/new`)}>Select</Button>
              </Card>
            ))}
          </div>
        ) : (
          <div>No campaigns found.</div>
        )}
      </Card>
    </div>
  );
};

export default CharacterCreateEntry;
