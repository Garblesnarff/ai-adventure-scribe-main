import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import SessionCard from './SessionCard';

import type { SessionListItem } from './SessionCard';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 10;
const SESSION_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 hours

const isSessionExpired = (session: SessionListItem) => {
  const start = session.start_time || session.created_at;
  if (!start) return false;
  const startTime = new Date(start).getTime();
  return Number.isFinite(startTime) ? Date.now() - startTime > SESSION_EXPIRY_MS : false;
};

const CampaignSessions: React.FC = () => {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [continuingId, setContinuingId] = React.useState<string | null>(null);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, error } =
    useInfiniteQuery({
      queryKey: ['campaign', campaignId, 'sessions'],
      queryFn: async ({ pageParam = 0 }): Promise<SessionListItem[]> => {
        if (!campaignId) return [];
        const from = pageParam * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data: rows, error: fetchError } = await supabase
          .from('game_sessions')
          .select(
            `
          id,
          session_number,
          status,
          start_time,
          end_time,
          summary,
          current_scene_description,
          turn_count,
          created_at,
          character:characters ( id, name, image_url )
        `,
          )
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (fetchError) {
          throw fetchError;
        }

        return (rows ?? []) as SessionListItem[];
      },
      getNextPageParam: (lastPage, pages) =>
        lastPage.length === PAGE_SIZE ? pages.length : undefined,
      enabled: Boolean(campaignId),
    });

  const sessions = React.useMemo(() => (data?.pages ? data.pages.flat() : []), [data?.pages]);

  React.useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`campaign-sessions-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['campaign', campaignId, 'sessions'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, queryClient]);

  const openStartSession = React.useCallback(() => {
    if (!campaignId) {
      toast({
        title: 'Campaign not found',
        description: 'Select a campaign before starting a session.',
        variant: 'destructive',
      });
      return;
    }

    const params = new URLSearchParams(location.search);
    params.set('startSession', 'true');
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' });
  }, [campaignId, location.pathname, location.search, navigate, toast]);

  const handleContinue = React.useCallback(
    async (session: SessionListItem) => {
      if (!campaignId) return;

      if (!session.character?.id) {
        toast({
          title: 'Character required',
          description:
            'This session is missing a character link. Please reassign before continuing.',
          variant: 'destructive',
        });
        return;
      }

      const expired = isSessionExpired(session) || session.status === 'expired';

      if (session.status === 'active' && !expired) {
        navigate(`/app/game/${campaignId}?character=${session.character.id}`);
        return;
      }

      setContinuingId(session.id);

      try {
        const { data: newSession, error: createError } = await supabase
          .from('game_sessions')
          .insert({
            campaign_id: campaignId,
            character_id: session.character.id,
            status: 'active',
            session_number: (session.session_number ?? 0) + 1,
            current_scene_description:
              session.current_scene_description ?? 'Continuing your adventure...',
            session_notes: session.summary
              ? `Continuing from Session ${session.session_number ?? ''}`
              : null,
            turn_count: 0,
            start_time: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError || !newSession) {
          throw createError || new Error('Failed to create continuation session.');
        }

        const createdSession = newSession as SessionListItem;

        toast({
          title: 'Session ready',
          description: createdSession.session_number
            ? `Session ${createdSession.session_number} created.`
            : 'New session created.',
        });

        await queryClient.invalidateQueries({ queryKey: ['campaign', campaignId, 'sessions'] });
        navigate(`/app/game/${campaignId}?character=${session.character?.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to continue session.';
        toast({
          title: 'Session continuation failed',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setContinuingId(null);
      }
    },
    [campaignId, navigate, queryClient, toast],
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-36 w-full" />
          ))}
        </div>
      );
    }

    if (error) {
      const message = error instanceof Error ? error.message : 'Failed to load sessions.';
      return (
        <Card className="p-6">
          <p className="text-destructive">{message}</p>
        </Card>
      );
    }

    if (sessions.length === 0) {
      return (
        <Card className="p-6 text-center space-y-3">
          <h3 className="text-lg font-semibold">No sessions yet</h3>
          <p className="text-sm text-muted-foreground">
            Start your first session to begin chronicling this campaign.
          </p>
          <Button onClick={openStartSession} className="mt-2">
            Start New Session
          </Button>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            expired={isSessionExpired(session) || session.status === 'expired'}
            onContinue={handleContinue}
            continuing={continuingId === session.id}
          />
        ))}
        {hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
              {isFetchingNextPage ? 'Loading...' : 'Load More Sessions'}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Sessions</h2>
          <p className="text-muted-foreground text-sm">
            Review past sessions and continue your adventure right where you left off.
          </p>
        </div>
        <Button onClick={openStartSession} className="md:self-center">
          Start New Session
        </Button>
      </div>
      {renderContent()}
    </div>
  );
};

export default CampaignSessions;
