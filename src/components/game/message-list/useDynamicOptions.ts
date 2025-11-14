import { useEffect, useRef, useState } from 'react';

import type { ChatMessage } from '@/types/game';

import { handleAsyncError } from '@/utils/error-handler';
import { parseMessageOptions } from '@/utils/parseMessageOptions';

const DYNAMIC_OPTIONS_FETCH_DELAY_MS = 10000;

type LastRollMeta = {
  kind: 'attack' | 'skill_check' | 'save' | 'damage' | 'initiative' | 'generic';
  skill?: string;
  weapon?: string;
  label?: string;
  result: number;
  nat?: number;
  dc?: number;
  ac?: number;
  success?: boolean;
};

interface UseDynamicOptionsProps {
  messages: ChatMessage[];
  getCurrentDiceRoll: () => any;
  isInCombat: boolean;
  lastRollRef: React.MutableRefObject<LastRollMeta | null>;
}

/**
 * Hook to manage dynamic options fetching
 * Fetches AI-generated action suggestions after DYNAMIC_OPTIONS_FETCH_DELAY_MS
 */
export const useDynamicOptions = ({
  messages,
  getCurrentDiceRoll,
  isInCombat,
  lastRollRef,
}: UseDynamicOptionsProps) => {
  const [dynamicOptions, setDynamicOptions] = useState<{ key: string; lines: string[] } | null>(
    null,
  );
  const optionsTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const enabled = String((import.meta as any)?.env?.VITE_DYNAMIC_OPTIONS ?? 'true').toLowerCase();
    const isEnabled = ['1', 'true', 'yes', 'on'].includes(enabled);
    if (!isEnabled) return;

    if (optionsTimerRef.current) {
      window.clearTimeout(optionsTimerRef.current);
      optionsTimerRef.current = null;
    }

    const reversed = [...messages].map((m, idx) => ({ m, idx })).reverse();
    const lastDmEntry = reversed.find((e) => e.m.sender === 'dm');
    const lastDm = lastDmEntry?.m;
    if (!lastDm) {
      setDynamicOptions(null);
      return;
    }

    const parsed = parseMessageOptions(lastDm.text || '');
    const hasInlineOptions = parsed?.hasOptions;
    const pendingRoll = !!getCurrentDiceRoll();

    if (hasInlineOptions || pendingRoll) {
      setDynamicOptions(null);
      return;
    }

    const abortController = new AbortController();
    let mounted = true;

    optionsTimerRef.current = window.setTimeout(async () => {
      try {
        const baseUrl = (import.meta as any)?.env?.VITE_CREWAI_BASE_URL || 'http://127.0.0.1:8000';
        const lastPlayer = [...messages].reverse().find((m) => m.sender === 'player');
        const history = messages.slice(Math.max(0, messages.length - 8)).map((m) => ({
          role: m.sender === 'player' ? 'user' : m.sender === 'dm' ? 'assistant' : 'system',
          content: m.text,
        }));

        let last_roll: LastRollMeta | null = null;
        if (lastRollRef.current) {
          last_roll = { ...lastRollRef.current };
          const dcMatch = (lastDm.text || '').match(/(?:dc|difficulty\s*class)\s*(\d+)/i);
          const acMatch = (lastDm.text || '').match(/(?:ac|armor\s*class)\s*[:=]?\s*(\d{1,2})/i);
          if (dcMatch && !last_roll.dc) last_roll.dc = parseInt(dcMatch[1], 10);
          if (acMatch && !last_roll.ac) last_roll.ac = parseInt(acMatch[1], 10);
          if (typeof last_roll.success === 'undefined') {
            if (typeof last_roll.dc === 'number')
              last_roll.success = last_roll.result >= last_roll.dc;
            if (typeof last_roll.ac === 'number')
              last_roll.success = last_roll.result >= last_roll.ac;
          }
        }

        const res = await fetch(`${baseUrl}/dm/options`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: null,
            last_dm_text: lastDm.text,
            player_message: lastPlayer?.text || '',
            history,
            state_section: `COMBAT: ${isInCombat ? 'ACTIVE' : 'NOT_IN_COMBAT'}`,
            last_roll,
          }),
          signal: abortController.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!mounted) return;

        if (lastRollRef.current) lastRollRef.current = null;
        const opts: string[] = Array.isArray(data?.options) ? data.options.slice(0, 3) : [];

        const genericPhrases = [
          'Approach cautiously',
          'Create a distraction',
          'Withdraw and reassess',
          'Explore another angle',
        ];
        const isGeneric =
          opts.length > 0 &&
          opts.filter((o) => genericPhrases.some((p) => o.includes(p))).length >= 2;
        const hasPending = !!getCurrentDiceRoll();

        if (opts.length && !(isGeneric && hasPending)) {
          const dmIdx = lastDmEntry?.idx ?? messages.length - 1;
          const key = lastDm.id || lastDm.timestamp || `idx-${dmIdx}`;
          setDynamicOptions({ key, lines: opts });
        } else {
          setDynamicOptions(null);
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        handleAsyncError(e, {
          userMessage: 'Failed to fetch dynamic options',
          logLevel: 'warn',
          showToast: false,
          context: { location: 'useDynamicOptions' },
        });
      }
    }, DYNAMIC_OPTIONS_FETCH_DELAY_MS);

    return () => {
      mounted = false;
      abortController.abort();
      if (optionsTimerRef.current) {
        window.clearTimeout(optionsTimerRef.current);
        optionsTimerRef.current = null;
      }
    };
  }, [messages, getCurrentDiceRoll, isInCombat]);

  return dynamicOptions;
};
