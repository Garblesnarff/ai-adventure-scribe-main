import { format, formatDistanceToNow } from 'date-fns';
import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type SessionStatusType = 'active' | 'completed' | 'expired' | 'ending' | null;

export interface SessionListItem {
  id: string;
  session_number: number | null;
  status: SessionStatusType;
  start_time: string | null;
  end_time: string | null;
  summary: string | null;
  current_scene_description: string | null;
  turn_count: number | null;
  created_at: string | null;
  character: {
    id: string;
    name: string | null;
    image_url?: string | null;
  } | null;
}

interface SessionCardProps {
  session: SessionListItem;
  expired: boolean;
  onContinue: (session: SessionListItem) => void;
  continuing?: boolean;
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ending: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  expired: 'bg-slate-200 text-slate-700 border-slate-300',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  ending: 'Ending',
  completed: 'Completed',
  expired: 'Expired',
};

const SessionCard: React.FC<SessionCardProps> = ({ session, expired, onContinue, continuing }) => {
  const statusKey = session.status ?? 'completed';
  const badgeClass = statusStyles[statusKey] ?? statusStyles.completed;
  const badgeLabel = statusLabels[statusKey] ?? 'Completed';

  const startedAt = session.start_time || session.created_at;
  const endedAt = session.end_time;

  const startedAgo = startedAt
    ? formatDistanceToNow(new Date(startedAt), { addSuffix: true })
    : 'Unknown start';
  const endedAgo = endedAt ? formatDistanceToNow(new Date(endedAt), { addSuffix: true }) : null;

  const characterName = session.character?.name ?? 'Unknown Character';
  const characterInitials = characterName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const continueDisabled = !session.character?.id || continuing;
  const continueLabel =
    session.status === 'active' && !expired ? 'Open Session' : 'Continue Session';

  return (
    <Card className="p-4 md:p-5 shadow-sm border border-border/60">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={cn('border', badgeClass)}>{badgeLabel}</Badge>
            <span className="text-sm font-semibold text-foreground">
              Session {session.session_number ?? '—'}
            </span>
            {startedAt && (
              <span className="text-sm text-muted-foreground">Started {startedAgo}</span>
            )}
            {endedAgo && (
              <span className="text-sm text-muted-foreground">&bull; Ended {endedAgo}</span>
            )}
            {session.turn_count != null && (
              <span className="text-sm text-muted-foreground">
                &bull; {session.turn_count} turns
              </span>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-base font-medium text-foreground">
              {session.summary?.trim() ||
                session.current_scene_description?.trim() ||
                'No summary recorded yet.'}
            </p>
            {startedAt && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(startedAt), 'PPP p')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Avatar className="h-10 w-10">
              {session.character?.image_url ? (
                <AvatarImage src={session.character.image_url} alt={characterName} />
              ) : null}
              <AvatarFallback>{characterInitials || 'PC'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{characterName}</p>
              <p className="text-xs text-muted-foreground">Linked character</p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:items-end">
          <Button
            onClick={() => onContinue(session)}
            disabled={continueDisabled}
            className="w-full md:w-44"
          >
            {continuing ? 'Continuing...' : continueLabel}
          </Button>
          {continueDisabled && !session.character?.id && (
            <p className="text-xs text-destructive/80 text-center md:text-right">
              Character missing. Reassign before continuing.
            </p>
          )}
          {expired && session.status === 'active' && (
            <p className="text-xs text-muted-foreground text-center md:text-right">
              Session expired. Continuing will create a new session.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SessionCard;
