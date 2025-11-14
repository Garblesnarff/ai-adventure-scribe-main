import { useState, useRef, useCallback, useEffect } from 'react';

import type { ChatMessage } from '@/types/game';

import logger from '@/lib/logger';
import { llmApiClient } from '@/services/llm-api-client';
import { generateSceneImage } from '@/services/scene-image-generator';
import { handleAsyncError } from '@/utils/error-handler';
import { parseMessageOptions } from '@/utils/parseMessageOptions';
import { removeRollRequestsFromMessage } from '@/utils/rollRequestParser';

interface UseImageGenerationProps {
  sessionId?: string;
  routeCampaignId?: string;
  character: any;
  campaign: any;
  messages: ChatMessage[];
}

/**
 * Hook to manage image generation for DM messages
 * Handles auto-generation, per-session caps, and localStorage caching
 */
export const useImageGeneration = ({
  sessionId,
  routeCampaignId,
  character,
  campaign,
  messages,
}: UseImageGenerationProps) => {
  const [generatingFor, setGeneratingFor] = useState<Set<string>>(new Set());
  const [imageByMessage, setImageByMessage] = useState<
    Record<string, { url: string; prompt: string }>
  >({});
  const [genErrorByMessage, setGenErrorByMessage] = useState<Record<string, string>>({});
  const lastGenRef = useRef<number>(0);

  // Env flags
  const AUTO = String((import.meta as any)?.env?.VITE_DM_AUTO_IMAGE ?? 'false').toLowerCase();
  const isAuto = ['1', 'true', 'yes', 'on'].includes(AUTO);
  const MAX = Number.parseInt(
    String((import.meta as any)?.env?.VITE_DM_IMAGE_MAX_PER_SESSION ?? '3'),
  );

  // Helpers for per-session caps
  const capKey = (sid: string) => `dm-img-cap:${sid}`;
  const trigKey = (sid: string, mid: string) => `dm-img-trig:${sid}:${mid}`;
  const getCap = (sid?: string) =>
    sid ? Number.parseInt(localStorage.getItem(capKey(sid)) || '0') : 0;
  const incCap = (sid?: string) => {
    if (!sid) return;
    const v = getCap(sid) + 1;
    localStorage.setItem(capKey(sid), String(v));
  };
  const alreadyTriggered = (sid?: string, mid?: string) =>
    !!sid && !!mid ? localStorage.getItem(trigKey(sid, mid)) === '1' : false;
  const markTriggered = (sid?: string, mid?: string) => {
    if (!sid || !mid) return;
    localStorage.setItem(trigKey(sid, mid), '1');
  };

  const handleGenerateScene = useCallback(
    async (message: ChatMessage & { id?: string; timestamp?: string }) => {
      const messageId = message.id || message.timestamp || `${Math.random()}`;
      try {
        setGenErrorByMessage((prev) => ({ ...prev, [messageId]: '' }));
        setGeneratingFor((prev) => new Set(prev).add(messageId));

        const parsed = parseMessageOptions(message.text || '');
        const baseText = parsed?.content || message.text || '';
        let sceneText = removeRollRequestsFromMessage(baseText);
        const vpMatch = (message.text || '').match(/^[\t ]*VISUAL\s+PROMPT:\s*(.+)$/im);
        if (vpMatch && vpMatch[1]) {
          sceneText += `\nVisual focus: ${vpMatch[1].trim()}`;
        }

        const t0 = performance.now();
        const shortId = String(messageId).slice(-8);
        const label = sessionId ? `scene-${sessionId}-${shortId}` : 'scene';
        const res = await generateSceneImage({
          sceneText,
          campaign: {
            id: routeCampaignId || undefined,
            name: campaign?.name,
            genre: campaign?.genre || undefined,
            tone: campaign?.tone || undefined,
            atmosphere: (campaign?.enhancementEffects?.atmosphere?.[0] as string) || undefined,
          },
          character: character
            ? {
                name: character.name,
                race: character.race as any,
                subrace: character.subrace as any,
                class: character.class as any,
                appearance: character.appearance || undefined,
                personality_notes:
                  character.personalityNotes || character.personality_notes || undefined,
                avatar_url: character.avatar_url || undefined,
                image_url: character.image_url || undefined,
                theme: character.theme || undefined,
              }
            : null,
          quality: (import.meta as any)?.env?.VITE_DM_IMAGE_QUALITY || 'low',
          model:
            (import.meta as any)?.env?.VITE_DM_IMAGE_MODEL ||
            'google/gemini-2.5-flash-image-preview',
          storage: routeCampaignId
            ? { entityType: 'campaign', entityId: routeCampaignId, label }
            : { label },
        });

        setImageByMessage((prev) => ({
          ...prev,
          [messageId]: { url: res.url, prompt: res.prompt },
        }));

        if (message.id) {
          try {
            await llmApiClient.appendMessageImage({
              messageId: message.id,
              image: { url: res.url, prompt: res.prompt, model: res.model, quality: res.quality },
            });
          } catch (persistErr) {
            handleAsyncError(persistErr, {
              userMessage: 'Failed to save generated image',
              logLevel: 'warn',
              showToast: false,
              context: { location: 'useImageGeneration.persist', messageId: message.id },
            });
          }
        }

        setGenErrorByMessage((prev) => {
          const updated = { ...prev };
          delete updated[messageId];
          return updated;
        });
        incCap(sessionId);
        lastGenRef.current = performance.now();
        logger.info('[useImageGeneration] Scene image generated', {
          ms: Math.round(lastGenRef.current - t0),
          model: res.model,
        });
      } catch (e: any) {
        const msg = e?.message || 'Failed to generate image';
        setGenErrorByMessage((prev) => ({ ...prev, [messageId]: msg }));
        handleAsyncError(e, {
          userMessage: 'Failed to generate scene image',
          context: { location: 'useImageGeneration', messageId },
        });
      } finally {
        setGeneratingFor((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }
    },
    [character, campaign, routeCampaignId, sessionId],
  );

  // Auto-generate on DM-suggested imageRequests
  useEffect(() => {
    if (!isAuto || !sessionId) return;
    if (getCap(sessionId) >= (Number.isFinite(MAX) ? MAX : 3)) return;

    const reversed = [...messages].map((m, idx) => ({ m, idx })).reverse();
    const lastDmEntry = reversed.find((e) => e.m.sender === 'dm');
    const lastDm = lastDmEntry?.m;
    if (!lastDm) return;

    const msgId = lastDm.id || lastDm.timestamp || `${lastDmEntry?.idx}`;
    if (alreadyTriggered(sessionId, String(msgId))) return;
    if (generatingFor.has(String(msgId))) return;

    const hasImageRequests =
      Array.isArray((lastDm as any).imageRequests) && (lastDm as any).imageRequests.length > 0;
    const hasVisualMarker = /^[\t ]*VISUAL\s+PROMPT:\s*(.+)$/im.test(lastDm.text || '');
    if (!hasImageRequests && !hasVisualMarker) return;

    if (performance.now() - lastGenRef.current < 1000) return;

    markTriggered(sessionId, String(msgId));
    handleGenerateScene(lastDm as any).catch(() => {});
  }, [messages, isAuto, sessionId, generatingFor, handleGenerateScene]);

  return {
    generatingFor,
    imageByMessage,
    genErrorByMessage,
    handleGenerateScene,
  };
};
