import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Sparkles } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';

/**
 * QuotaDisplay Component
 *
 * Displays remaining daily AI usage quota for free tier users.
 * Shows upgrade CTA when quota is low (< 5 remaining).
 * Fetches data from backend /v1/llm/quota endpoint.
 */
export function QuotaDisplay() {
  const { data: quota, isLoading } = useQuery({
    queryKey: ['llm-quota'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch('http://localhost:8888/v1/llm/quota', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quota');
      }

      return response.json() as Promise<{
        plan: string;
        limits: { daily: { llm: number; image: number; voice: number } };
        usage: number;
        remaining: number;
        resetAt: string;
      }>;
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Only show for free tier users
  if (isLoading || !quota || quota.plan !== 'free') {
    return null;
  }

  const isLow = quota.remaining < 5;
  const isVeryLow = quota.remaining < 2;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
        isVeryLow
          ? 'bg-red-500/30 border-red-500/50 animate-pulse'
          : isLow
            ? 'bg-orange-500/20 border-orange-500/30'
            : 'bg-infinite-gold/20 border-infinite-gold/30'
      }`}
    >
      {isLow && <AlertCircle className="w-3 h-3 text-red-400" />}
      <span
        className={`text-xs font-medium ${
          isVeryLow ? 'text-red-300' : isLow ? 'text-orange-300' : 'text-infinite-gold'
        }`}
      >
        🎲 Daily Credits: {quota.remaining}/{quota.limits.daily.llm}
      </span>
      {isLow && (
        <a
          href="/upgrade"
          className="text-xs underline text-infinite-gold hover:text-infinite-gold/80 transition-colors flex items-center gap-1"
          onClick={(e) => {
            e.preventDefault();
            // TODO: Navigate to upgrade page when it exists
            alert(
              'Upgrade to Pro for unlimited adventures! Visit https://infiniterealms.app/pricing',
            );
          }}
        >
          <Sparkles className="w-3 h-3" />
          Upgrade
        </a>
      )}
    </div>
  );
}
