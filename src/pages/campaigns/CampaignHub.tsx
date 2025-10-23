import React from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCampaign } from '@/contexts/CampaignContext';
import { Skeleton } from '@/components/ui/skeleton';

import CampaignOverview from './CampaignOverview';
import CampaignCharacters from './CampaignCharacters';
import CampaignSessions from './CampaignSessions';
import CampaignWorld from './CampaignWorld';
import CampaignSettings from './CampaignSettings';

const CampaignHub: React.FC = () => {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = useCampaign();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId as string)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(campaignId),
  });

  React.useEffect(() => {
    if (campaign) {
      dispatch({ type: 'UPDATE_CAMPAIGN', payload: { id: campaign.id, name: campaign.name, defaultArtStyle: campaign.theme || 'fantasy', description: campaign.description, genre: campaign.genre, tone: campaign.tone, difficulty_level: campaign.difficulty_level, campaign_length: campaign.campaign_length } });
    }
  }, [campaign, dispatch]);

  const currentTab = React.useMemo(() => {
    if (location.pathname.endsWith('/characters') || location.pathname.includes('/characters/')) return 'characters';
    if (location.pathname.endsWith('/sessions')) return 'sessions';
    if (location.pathname.endsWith('/world')) return 'world';
    if (location.pathname.endsWith('/settings')) return 'settings';
    return 'overview';
  }, [location.pathname]);

  const onTabChange = (value: string) => {
    navigate(`/app/campaigns/${campaignId}/${value === 'overview' ? '' : value}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Skeleton className="h-6 w-1/4 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 text-center">Campaign not found</Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground">Campaign Hub</p>
          </div>
          <Button asChild>
            <Link to={`/app/campaigns/${campaignId}/characters`}>Characters</Link>
          </Button>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="world">World</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <CampaignOverview />
        </TabsContent>
        <TabsContent value="characters">
          <Routes>
            <Route index element={<CampaignCharacters />} />
            <Route path="new" element={<CampaignCharacters mode="create" />} />
          </Routes>
        </TabsContent>
        <TabsContent value="sessions">
          <CampaignSessions />
        </TabsContent>
        <TabsContent value="world">
          <CampaignWorld />
        </TabsContent>
        <TabsContent value="settings">
          <CampaignSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignHub;
