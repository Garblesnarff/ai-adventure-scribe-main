import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import CampaignCharacters from './CampaignCharacters';
import CampaignOverview from './CampaignOverview';
import CampaignSessions from './CampaignSessions';
import CampaignSettings from './CampaignSettings';
import CampaignWorld from './CampaignWorld';

import CharacterSelectionModal from '@/components/campaign-list/character-selection-modal';
import { ErrorBoundaryTest } from '@/components/error/ErrorBoundaryTest';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCampaign } from '@/contexts/CampaignContext';
import { supabase } from '@/integrations/supabase/client';

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
      dispatch({
        type: 'UPDATE_CAMPAIGN',
        payload: {
          id: campaign.id,
          name: campaign.name,
          defaultArtStyle: 'fantasy',
          description: campaign.description || undefined,
          genre: campaign.genre || undefined,
          tone: campaign.tone as 'serious' | 'humorous' | 'gritty' | undefined,
          difficulty_level: campaign.difficulty_level || undefined,
          campaign_length: campaign.campaign_length as 'one-shot' | 'short' | 'full' | undefined,
        },
      });
    }
  }, [campaign, dispatch]);

  const currentTab = React.useMemo(() => {
    if (location.pathname.endsWith('/characters') || location.pathname.includes('/characters/'))
      return 'characters';
    if (location.pathname.endsWith('/sessions')) return 'sessions';
    if (location.pathname.endsWith('/world')) return 'world';
    if (location.pathname.endsWith('/settings')) return 'settings';
    return 'overview';
  }, [location.pathname]);

  const onTabChange = (value: string) => {
    navigate(`/app/campaigns/${campaignId}/${value === 'overview' ? '' : value}`);
  };

  const [showCharacterModal, setShowCharacterModal] = React.useState(false);
  const searchParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);

  React.useEffect(() => {
    if (searchParams.get('startSession') === 'true' && !showCharacterModal) {
      setShowCharacterModal(true);
    }
  }, [searchParams, showCharacterModal]);

  const openCharacterModal = React.useCallback(() => {
    setShowCharacterModal(true);
    const params = new URLSearchParams(location.search);
    params.set('startSession', 'true');
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  const closeCharacterModal = React.useCallback(() => {
    setShowCharacterModal(false);
    const params = new URLSearchParams(location.search);
    if (params.has('startSession')) {
      params.delete('startSession');
      const search = params.toString();
      navigate(
        { pathname: location.pathname, search: search ? `?${search}` : '' },
        { replace: true },
      );
    }
  }, [location.pathname, location.search, navigate]);
  const isCharacterCreationRoute = React.useMemo(
    () => location.pathname.includes('/characters/new'),
    [location.pathname],
  );

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20">
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="mb-6">
          <div className="glass-strong rounded-2xl p-6 hover-lift">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-infinite-purple to-infinite-gold flex items-center justify-center shadow-lg">
                    <span className="text-xl">⚔️</span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-infinite-purple to-infinite-gold bg-clip-text text-transparent">
                      {campaign.name}
                    </h1>
                    <p className="dark:text-gray-200 text-gray-700">Epic Campaign Adventure</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  className="bg-gradient-to-r from-infinite-purple to-infinite-purple-dark hover:from-infinite-purple-dark hover:to-infinite-purple text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Link to={`/app/campaigns/${campaignId}/characters`}>
                    <Users className="w-4 h-4 mr-2" />
                    Manage Characters
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="border-infinite-gold text-infinite-gold hover:bg-infinite-gold/10"
                  onClick={openCharacterModal}
                >
                  <span className="mr-2">+</span>
                  New Session
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <Tabs
          value={currentTab}
          onValueChange={onTabChange}
          aria-label="Campaign sections"
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-1 mb-4">
            <TabsTrigger
              value="overview"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-infinite-purple data-[state=active]:to-infinite-purple-dark data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium"
            >
              📜 Overview
            </TabsTrigger>
            <TabsTrigger
              value="characters"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-infinite-gold data-[state=active]:to-infinite-gold-dark data-[state=active]:text-infinite-dark data-[state=active]:shadow-lg transition-all duration-300 font-medium"
            >
              ⚔️ Characters
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-infinite-teal data-[state=active]:to-infinite-teal-dark data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium"
            >
              📖 Sessions
            </TabsTrigger>
            <TabsTrigger
              value="world"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium"
            >
              🌍 World
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-600 data-[state=active]:to-slate-700 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium"
            >
              ⚙️ Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <CampaignOverview campaign={campaign} onStartNewSession={openCharacterModal} />
          </TabsContent>
          <TabsContent value="characters">
            <CampaignCharacters mode={isCharacterCreationRoute ? 'create' : 'list'} />
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

      <CharacterSelectionModal
        isOpen={showCharacterModal}
        onClose={closeCharacterModal}
        campaignId={campaign.id}
        campaignName={campaign.name}
      />

      {/* Development only: Error boundary testing */}
      {import.meta.env.DEV && <ErrorBoundaryTest />}
    </div>
  );
};

export default CampaignHub;
