import React, { useMemo, useState, useRef, useEffect } from 'react';
import logger from '@/lib/logger';
import { ChatMessage } from '@/types/game';
import { useMessageContext } from '@/contexts/MessageContext';
import { useGame } from '@/contexts/GameContext';
import { CombatMessage, InitiativeMessage, CombatSummaryMessage } from '@/components/combat/CombatMessage';
import { DiceRollMessage } from '@/components/game/DiceRollMessage';
import { DiceRollRequest } from '@/components/game/DiceRollRequest';
import { DMMessageVoiceControls } from '@/components/game/voice/DMMessageVoiceControls';
import { ActionOptions } from '@/components/game/ActionOptions';
import { parseMessageOptions, createPlayerMessageFromOption } from '@/utils/parseMessageOptions';
import { parseRollRequests, removeRollRequestsFromMessage } from '@/utils/rollRequestParser';
import { rollDice } from '@/utils/diceUtils';
import { useCombat } from '@/contexts/CombatContext';
import { Button } from '@/components/ui/button';
import { useCharacter } from '@/contexts/CharacterContext';
import { useCampaign } from '@/contexts/CampaignContext';
import { generateSceneImage } from '@/services/scene-image-generator';
import { llmApiClient } from '@/services/llm-api-client';
import { Image as ImageIcon, RefreshCw, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

interface MessageListProps {
  onSendFullMessage?: (message: string) => Promise<void>;
  sessionId?: string;
  /** Optional ref to the scroll container so parents can attach helpers (e.g., timeline rail) */
  containerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * MessageList Component
 * Displays a list of chat messages with styling based on sender type
 */
export const MessageList: React.FC<MessageListProps> = ({ onSendFullMessage, sessionId, containerRef }) => {
  const { messages = [], sendMessage } = useMessageContext();
  const { getCurrentDiceRoll, completeDiceRoll, cancelDiceRoll } = useGame();
  const { state: combatState } = useCombat();
  const { state: characterState } = useCharacter();
  const { state: campaignState } = useCampaign();
  const { id: routeCampaignId } = useParams<{ id: string }>();
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const internalRef = useRef<HTMLDivElement | null>(null);
  // Prefer external ref when provided; otherwise use internal
  const messagesRef = (containerRef as React.RefObject<HTMLDivElement>) || internalRef;
  const [dynamicOptions, setDynamicOptions] = useState<{ key: string; lines: string[] } | null>(null);
  const optionsTimerRef = useRef<number | null>(null);
  const [generatingFor, setGeneratingFor] = useState<Set<string>>(new Set());
  const [imageByMessage, setImageByMessage] = useState<Record<string, { url: string; prompt: string }>>({});
  const [genErrorByMessage, setGenErrorByMessage] = useState<Record<string, string>>({});
  const lastGenRef = useRef<number>(0);

  // Env flags for auto image generation and caps
  const AUTO = String(((import.meta as any)?.env?.VITE_DM_AUTO_IMAGE ?? 'false')).toLowerCase();
  const isAuto = ['1','true','yes','on'].includes(AUTO);
  const MAX = Number.parseInt(String(((import.meta as any)?.env?.VITE_DM_IMAGE_MAX_PER_SESSION ?? '3')));

  // Helpers for per-session caps & per-message trigger markers
  const capKey = (sid: string) => `dm-img-cap:${sid}`;
  const trigKey = (sid: string, mid: string) => `dm-img-trig:${sid}:${mid}`;
  const getCap = (sid?: string) => sid ? Number.parseInt(localStorage.getItem(capKey(sid)) || '0') : 0;
  const incCap = (sid?: string) => { if (!sid) return; const v = getCap(sid) + 1; localStorage.setItem(capKey(sid), String(v)); };
  const alreadyTriggered = (sid?: string, mid?: string) => (!!sid && !!mid) ? localStorage.getItem(trigKey(sid, mid)) === '1' : false;
  const markTriggered = (sid?: string, mid?: string) => { if (!sid || !mid) return; localStorage.setItem(trigKey(sid, mid), '1'); };
  // Last roll metadata to inform /dm/options (sent once after a roll completes)
  type LastRollMeta = {
    kind: 'attack'|'skill_check'|'save'|'damage'|'initiative'|'generic';
    skill?: string;
    weapon?: string;
    label?: string;
    result: number;
    nat?: number;
    dc?: number;
    ac?: number;
    success?: boolean;
  };
  const lastRollRef = useRef<LastRollMeta | null>(null);

  // Auto-scroll behavior: scroll to bottom when new messages arrive unless user scrolled up
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) {
      return;
    }
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      setIsUserScrolledUp(!atBottom);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el || isUserScrolledUp) {
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isUserScrolledUp]);

  // Dynamic options fetch: trigger 10s after the latest DM message if it lacks options and no roll is pending
  useEffect(() => {
    const enabled = String((import.meta as any)?.env?.VITE_DYNAMIC_OPTIONS ?? 'true').toLowerCase();
    const isEnabled = ['1', 'true', 'yes', 'on'].includes(enabled);
    if (!isEnabled) {
      return;
    }

    if (optionsTimerRef.current) {
      window.clearTimeout(optionsTimerRef.current);
      optionsTimerRef.current = null;
    }

    const reversed = [...messages].map((m, idx) => ({ m, idx })).reverse();
    const lastDmEntry = reversed.find(e => e.m.sender === 'dm');
    const lastDm = lastDmEntry?.m;
    if (!lastDm) {
      setDynamicOptions(null);
      return;
    }

    const parsed = parseMessageOptions(lastDm.text || '');
    const hasInlineOptions = parsed?.hasOptions;
    const pendingRoll = !!getCurrentDiceRoll();

    // Suppress when a roll is pending (keep suggestions during combat as requested)
    if (hasInlineOptions || pendingRoll) {
      setDynamicOptions(null);
      return;
    }

    // Delay 10s then fetch options
    optionsTimerRef.current = window.setTimeout(async () => {
      try {
        const baseUrl = (import.meta as any)?.env?.VITE_CREWAI_BASE_URL || 'http://127.0.0.1:8000';
        const lastPlayer = [...messages].reverse().find(m => m.sender === 'player');
        const history = messages.slice(Math.max(0, messages.length - 8)).map(m => ({
          role: m.sender === 'player' ? 'user' : (m.sender === 'dm' ? 'assistant' : 'system'),
          content: m.text,
        }));
        // Prepare last_roll payload if present; enrich DC/AC from last DM text
        let last_roll: LastRollMeta | null = null;
        if (lastRollRef.current) {
          last_roll = { ...lastRollRef.current };
          const dcMatch = (lastDm.text || '').match(/(?:dc|difficulty\s*class)\s*(\d+)/i);
          const acMatch = (lastDm.text || '').match(/(?:ac|armor\s*class)\s*[:=]?\s*(\d{1,2})/i);
          if (dcMatch && !last_roll.dc) last_roll.dc = parseInt(dcMatch[1], 10);
          if (acMatch && !last_roll.ac) last_roll.ac = parseInt(acMatch[1], 10);
          if (typeof last_roll.success === 'undefined') {
            if (typeof last_roll.dc === 'number') last_roll.success = last_roll.result >= last_roll.dc;
            if (typeof last_roll.ac === 'number') last_roll.success = last_roll.result >= last_roll.ac;
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
            // Provide a minimal state summary to improve specificity when backend uses it
            state_section: `COMBAT: ${combatState.isInCombat ? 'ACTIVE' : 'NOT_IN_COMBAT'}`,
            last_roll,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Clear last_roll after a successful fetch to avoid re-sending
        if (lastRollRef.current) lastRollRef.current = null;
        const opts: string[] = Array.isArray(data?.options) ? data.options.slice(0, 3) : [];

        // Heuristic filter: drop bland generic fallback options ONLY if a roll popup is pending
        const genericPhrases = [
          'Approach cautiously',
          'Create a distraction',
          'Withdraw and reassess',
          'Explore another angle'
        ];
        const isGeneric = opts.length > 0 && opts.filter(o => genericPhrases.some(p => o.includes(p))).length >= 2;
        const hasPending = !!getCurrentDiceRoll();

        if (opts.length && !(isGeneric && hasPending)) {
          const dmIdx = lastDmEntry?.idx ?? messages.length - 1;
          const key = lastDm.id || lastDm.timestamp || `idx-${dmIdx}`;
          setDynamicOptions({ key, lines: opts });
        } else {
          // Suppress showing generic fallbacks to avoid low-value UX
          setDynamicOptions(null);
        }
      } catch (e) {
        console.warn('[MessageList] dynamic options fetch failed:', e);
      }
    }, 10000);

    return () => {
      if (optionsTimerRef.current) {
        window.clearTimeout(optionsTimerRef.current);
        optionsTimerRef.current = null;
      }
    };
  }, [messages, getCurrentDiceRoll]);

  // Group consecutive messages from the same sender
  const groupedMessages = useMemo(() => {
    if (!messages.length) {
      return [];
    }

    const groups: { sender: string; messages: ChatMessage[]; isPlayer: boolean }[] = [];
    let currentGroup = { sender: messages[0].sender, messages: [messages[0]], isPlayer: messages[0].sender === 'player' };

    for (let i = 1; i < messages.length; i++) {
      const message = messages[i];
      if (message.sender === currentGroup.sender) {
        currentGroup.messages.push(message);
      } else {
        groups.push(currentGroup);
        currentGroup = { sender: message.sender, messages: [message], isPlayer: message.sender === 'player' };
      }
    }
    groups.push(currentGroup);
    return groups;
  }, [messages]);

  // Handle option selection
  const handleOptionSelect = React.useCallback(async (optionText: string) => {
    logger.info('[MessageList] Handling option selection:', optionText);

    try {
      if (onSendFullMessage) {
        // Use the full message flow (includes AI response)
        logger.info('[MessageList] Using full message flow for option selection');
        await onSendFullMessage(optionText);
      } else {
        // Fallback to basic message sending (no AI response)
        logger.info('[MessageList] Using fallback message flow for option selection');
        const playerMessage: ChatMessage = {
          text: optionText,
          sender: 'player',
          timestamp: new Date().toISOString()
        };

        logger.info('[MessageList] Created player message:', playerMessage);
        await sendMessage(playerMessage);
      }
      logger.info('[MessageList] Successfully sent option message');
    } catch (error) {
      logger.error('[MessageList] Failed to send option selection:', error);
    }
  }, [onSendFullMessage, sendMessage]);

  // Image generation handler per DM message
  const handleGenerateScene = React.useCallback(async (message: ChatMessage & { id?: string; timestamp?: string }) => {
    const messageId = message.id || message.timestamp || `${Math.random()}`;
    try {
      setGenErrorByMessage(prev => ({ ...prev, [messageId]: '' }));
      setGeneratingFor(prev => new Set(prev).add(messageId));

      // Derive clean scene text (drop inline roll requests/options)
      const parsed = parseMessageOptions(message.text || '');
      const baseText = parsed?.content || message.text || '';
      let sceneText = removeRollRequestsFromMessage(baseText);
      // If DM provided a visual prompt marker, append it to guide image gen
      const vpMatch = (message.text || '').match(/^[\t ]*VISUAL\s+PROMPT:\s*(.+)$/im);
      if (vpMatch && vpMatch[1]) {
        sceneText += `\nVisual focus: ${vpMatch[1].trim()}`;
      }

      const character = characterState.character;
      const campaign = campaignState.campaign;
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
        character: character ? {
          name: character.name,
          race: character.race as any,
          subrace: character.subrace as any,
          class: character.class as any,
          appearance: character.appearance || undefined,
          personality_notes: character.personalityNotes || character.personality_notes || undefined,
          avatar_url: character.avatar_url || undefined,
          image_url: character.image_url || undefined,
          theme: character.theme || undefined,
        } : null,
        quality: (import.meta as any)?.env?.VITE_DM_IMAGE_QUALITY || 'low',
        model: (import.meta as any)?.env?.VITE_DM_IMAGE_MODEL || 'google/gemini-2.5-flash-image-preview',
        storage: routeCampaignId ? { entityType: 'campaign', entityId: routeCampaignId, label } : { label },
      });

      setImageByMessage(prev => ({ ...prev, [messageId]: { url: res.url, prompt: res.prompt } }));
      // Persist to dialogue_history if this message has an id
      if (message.id) {
        try {
          await llmApiClient.appendMessageImage({
            messageId: message.id,
            image: { url: res.url, prompt: res.prompt, model: res.model, quality: res.quality }
          });
        } catch (persistErr) {
          logger.warn('[MessageList] Failed to persist image to message', persistErr);
        }
      }
      incCap(sessionId);
      lastGenRef.current = performance.now();
      logger.info('[MessageList] Scene image generated', { ms: Math.round(lastGenRef.current - t0), model: res.model });
    } catch (e: any) {
      const msg = e?.message || 'Failed to generate image';
      setGenErrorByMessage(prev => ({ ...prev, [messageId]: msg }));
      logger.error('[MessageList] Scene image generation failed:', e);
    } finally {
      setGeneratingFor(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  }, [characterState.character, campaignState.campaign, routeCampaignId]);

  // Auto-generate on DM-suggested imageRequests (flag + caps)
  useEffect(() => {
    if (!isAuto || !sessionId) return;
    if (getCap(sessionId) >= (Number.isFinite(MAX) ? MAX : 3)) return;

    const reversed = [...messages].map((m, idx) => ({ m, idx })).reverse();
    const lastDmEntry = reversed.find(e => e.m.sender === 'dm');
    const lastDm = lastDmEntry?.m;
    if (!lastDm) return;

    const msgId = lastDm.id || lastDm.timestamp || `${lastDmEntry?.idx}`;
    if (alreadyTriggered(sessionId, String(msgId))) return;
    if (generatingFor.has(String(msgId))) return;

    // require explicit imageRequests or visual prompt marker to auto-trigger
    const hasImageRequests = Array.isArray((lastDm as any).imageRequests) && (lastDm as any).imageRequests.length > 0;
    const hasVisualMarker = /^[\t ]*VISUAL\s+PROMPT:\s*(.+)$/im.test(lastDm.text || '');
    if (!hasImageRequests && !hasVisualMarker) return;

    // simple cooldown to avoid bursts
    if (performance.now() - lastGenRef.current < 1000) return;

    // Trigger once
    markTriggered(sessionId, String(msgId));
    handleGenerateScene(lastDm as any).catch(() => { /* handled in handler */ });
  }, [messages, isAuto, sessionId, generatingFor, handleGenerateScene]);

  // Handle dice roll requests from GameContext queue
  const handleDiceRoll = React.useCallback(async (formula: string, advantage?: boolean, disadvantage?: boolean) => {
    logger.info('[MessageList] Handling dice roll from queue:', { formula, advantage, disadvantage });

    const currentRoll = getCurrentDiceRoll();
    if (!currentRoll) {
      logger.warn('[MessageList] No current dice roll in queue');
      return;
    }

    try {
      // Parse the formula to extract die type, count, and modifier
      const diceMatch = formula.match(/(\d+)d(\d+)([+-]\d+)?/);
      if (!diceMatch) {
        logger.error('[MessageList] Invalid dice formula:', formula);
        return;
      }

      const count = parseInt(diceMatch[1]);
      const dieType = parseInt(diceMatch[2]);
      const modifierMatch = diceMatch[3];
      const modifier = modifierMatch ? parseInt(modifierMatch) : 0;

      // Roll the dice
      const rollResult = rollDice(dieType, count, modifier, {
        advantage: advantage || false,
        disadvantage: disadvantage || false
      });

      logger.info('[MessageList] Roll result:', rollResult);

      // Complete the dice roll in GameContext
      completeDiceRoll(currentRoll.id, rollResult);

      // Create dice roll message
      const diceRollMessage: ChatMessage = {
        text: `Rolled ${formula}${advantage ? ' with advantage' : disadvantage ? ' with disadvantage' : ''} = ${rollResult.total}`,
        sender: 'player',
        timestamp: new Date().toISOString(),
        context: {
          intent: 'dice_roll',
          diceRoll: {
            formula,
            count,
            dieType,
            modifier,
            advantage: advantage || false,
            disadvantage: disadvantage || false,
            results: rollResult.results,
            keptResults: rollResult.keptResults,
            total: rollResult.total,
            naturalRoll: rollResult.naturalRoll,
            critical: rollResult.critical,
            timestamp: new Date().toISOString()
          }
        }
      };

      // Send the dice roll message
      await sendMessage(diceRollMessage);

      // Capture last roll meta for context-aware options
      const mapKind = (t: string): LastRollMeta['kind'] => {
        switch (t) {
          case 'attack': return 'attack';
          case 'damage': return 'damage';
          case 'initiative': return 'initiative';
          case 'saving_throw':
          case 'death_save':
          case 'concentration_save':
            return 'save';
          case 'ability_check':
          case 'skill_check':
            return 'skill_check';
          default: return 'generic';
        }
      };
      const extractSkill = (label?: string): string | undefined => {
        if (!label) return undefined;
        const skills = [
          'stealth','perception','investigation','insight','persuasion','deception','intimidation','athletics','acrobatics','arcana','history','medicine','nature','religion','survival','performance','sleight of hand','animal handling'
        ];
        const lower = label.toLowerCase();
        return skills.find(s => lower.includes(s)) || undefined;
      };
      const extractWeapon = (label?: string): string | undefined => {
        if (!label) return undefined;
        const m = label.match(/\b(?:with|using|wielding|firing|shooting|from)\s+(?:your|my|the)?\s*([A-Za-z][\w' -]{2,40})/i);
        return m ? m[1].trim() : undefined;
      };
      const current = getCurrentDiceRoll();
      if (current) {
        lastRollRef.current = {
          kind: mapKind(current.requestType),
          skill: extractSkill(current.description),
          weapon: extractWeapon(current.description),
          label: current.description,
          result: rollResult.total,
          nat: rollResult.naturalRoll,
        };
      }

      // NOTE: DM will get information from the dice roll message context above
      // Don't send a second text message to avoid duplicates
    } catch (error) {
      logger.error('[MessageList] Failed to handle dice roll:', error);
    }
  }, [sendMessage, getCurrentDiceRoll, completeDiceRoll]);

  // Handle manual dice result input from GameContext queue
  const handleManualResult = React.useCallback(async (result: number) => {
    const currentRoll = getCurrentDiceRoll();
    if (!currentRoll) {
      logger.warn('[MessageList] No current dice roll in queue');
      return;
    }

    try {
      // Ensure result is a number
      let numericResult: number;
      if (typeof result === 'number') {
        numericResult = result;
      } else if (typeof result === 'object' && result && 'total' in result) {
        numericResult = (result as any).total;
        logger.warn('[MessageList] Received object in handleManualResult, extracting total:', numericResult);
      } else {
        logger.error('[MessageList] Invalid result type in handleManualResult:', result);
        return;
      }

      // Complete the dice roll in GameContext
      completeDiceRoll(currentRoll.id, { total: numericResult });

      // Send to DM through the full message flow
      if (onSendFullMessage) {
        await onSendFullMessage(`I rolled ${numericResult}`);
      } else {
        // Fallback to direct message if no full message flow available
        const playerMessage: ChatMessage = {
          text: `I rolled ${numericResult}`,
          sender: 'player',
          timestamp: new Date().toISOString()
        };
        await sendMessage(playerMessage);
      }

      // Capture last roll meta for options (manual entry)
      const current = getCurrentDiceRoll();
      if (current) {
        const mapKind = (t: string): LastRollMeta['kind'] => {
          switch (t) {
            case 'attack': return 'attack';
            case 'damage': return 'damage';
            case 'initiative': return 'initiative';
            case 'saving_throw':
            case 'death_save':
            case 'concentration_save':
              return 'save';
            case 'ability_check':
            case 'skill_check':
              return 'skill_check';
            default: return 'generic';
          }
        };
        lastRollRef.current = {
          kind: mapKind(current.requestType),
          label: current.description,
          skill: ((): string | undefined => {
            const lower = (current.description || '').toLowerCase();
            const skills = [
              'stealth','perception','investigation','insight','persuasion','deception','intimidation','athletics','acrobatics','arcana','history','medicine','nature','religion','survival','performance','sleight of hand','animal handling'
            ];
            return skills.find(s => lower.includes(s)) || undefined;
          })(),
          result: numericResult,
        };
      }
    } catch (error) {
      logger.error('[MessageList] Failed to handle manual dice result:', error);
    }
  }, [sendMessage, onSendFullMessage, getCurrentDiceRoll, completeDiceRoll]);

  return (
    <div
      className="flex-1 overflow-y-auto px-6 py-6 space-y-4 chat-scroll parchment-panel"
      role="log"
      aria-live="polite"
      ref={messagesRef}
    >
      {groupedMessages.map((group, groupIndex) => (
        <div key={`group-${groupIndex}`} className={`flex ${group.isPlayer ? 'justify-end' : 'justify-start'} group`}>
          <div className={`flex max-w-[90%] ${group.isPlayer ? 'flex-row-reverse' : 'flex-row'} items-start`}>
            {/* Avatar for first message in group */}
            {!group.isPlayer ? (
              <div className="flex-shrink-0 mr-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-primary text-primary-foreground" aria-hidden>
                  DM
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0 ml-3 mb-2">
                {group.messages[0].characterAvatar ? (
                  <img
                    src={group.messages[0].characterAvatar}
                    alt="Character avatar"
                    className="w-10 h-10 rounded-full object-cover border-2 border-card"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-card text-card-foreground border-2 border-primary" aria-hidden>
                    {group.messages[0].characterName?.charAt(0).toUpperCase() || 'P'}
                  </div>
                )}
              </div>
            )}

            <div className={`flex flex-col ${group.isPlayer ? 'items-end' : 'items-start'} space-y-2 w-full`}>
              {group.messages.map((message, msgIndex) => {
                const isFirstInGroup = msgIndex === 0;
                const isLastInGroup = msgIndex === group.messages.length - 1;
                const isDM = message.sender === 'dm';
                const messageId = message.id || message.timestamp || `${groupIndex}-${msgIndex}`;

                // Compose display text with dynamic options overlay (DM last-in-group only)
                const shouldOverlay = isDM && isLastInGroup && dynamicOptions?.key === messageId;
                const messageWithOverlay = shouldOverlay && dynamicOptions?.lines?.length
                  ? `${message.text}\n${dynamicOptions.lines.join('\n')}`
                  : message.text;

                // Parse for this message (using overlay text when present)
                const parsedMessage = isDM ? parseMessageOptions(messageWithOverlay) : null;
                const structuredRollRequests = isDM && (message as any).rollRequests ? (message as any).rollRequests as any[] : [];
                const parsedRollRequests = isDM && structuredRollRequests.length === 0 ? parseRollRequests(message.text) : [];
                const rollRequests = structuredRollRequests.length > 0 ? 
                  structuredRollRequests.map((req: any) => ({ ...req, originalText: req.originalText ?? '', confidence: req.confidence ?? 1.0 })) : 
                  parsedRollRequests;
                const hasRollRequests = Array.isArray(rollRequests) && rollRequests.length > 0;

                // Truncation logic
                const baseText = parsedMessage ? (parsedMessage.content || messageWithOverlay) : messageWithOverlay;
                const isLongMessage = baseText.length > 200;
                const isExpanded = expandedMessages.has(messageId);
                const displayText = isLongMessage && !isExpanded 
                  ? `${baseText.substring(0, 200)}... ` 
                  : baseText;

                const toggleExpanded = () => {
                  setExpandedMessages(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(messageId)) {
                      newSet.delete(messageId);
                    } else {
                      newSet.add(messageId);
                    }
                    return newSet;
                  });
                };

                return (
                  <div
                    key={messageId}
                    id={`m-${messageId}`}
                    data-anchor={isDM ? 'true' : 'false'}
                    className={`w-full ${isFirstInGroup ? '' : 'mt-1'}`}
                  >
                    {/* Special message types */}
                    {message.context?.diceRoll ? (
                      <div className="w-full">
                        <DiceRollMessage 
                          data={message.context.diceRoll}
                          playerName={group.isPlayer ? 'You' : 'DM'}
                        />
                      </div>
                    ) : message.context?.combatData ? (
                      <div className="w-full">
                        {message.context.combatData.type === 'initiative' ? (
                          <InitiativeMessage 
                            participants={message.context.combatData.participants || []}
                            timestamp={message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
                          />
                        ) : message.context.combatData.summary ? (
                          <CombatSummaryMessage 
                            summary={message.context.combatData.summary}
                            timestamp={message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
                          />
                        ) : (
                          <CombatMessage 
                            data={message.context.combatData as any}
                            timestamp={message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
                          />
                        )}
                      </div>
                    ) : (
                      /* Regular message bubble - only first/last have full styling */
                      <div
                        className={
                          `relative px-3 py-2 rounded-xl transition-all duration-200 message-bubble ` +
                          (isDM
                            ? 'dm-bubble border-l-4 border-l-primary/20 bg-gradient-to-r from-infinite-purple/80 to-infinite-teal/60 text-white shadow-md '
                            : group.isPlayer
                              ? 'player-bubble ml-auto bg-card text-card-foreground shadow-sm '
                              : 'system-bubble bg-muted/20 '
                          ) +
                          (isFirstInGroup ? 'rounded-t-xl pt-3 ' : '') +
                          (isLastInGroup ? 'rounded-b-xl pb-3 ' : 'border-b border-border/20 ') +
                          'animate-in fade-in'
                        }
                      >
                        {/* Message content */}
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {(() => {
                            let content = parsedMessage ? parsedMessage.content || messageWithOverlay : messageWithOverlay;
                            if (hasRollRequests) {
                              content = removeRollRequestsFromMessage(content);
                            }
                            // Remove optional DM visual prompt marker from display
                            content = content.replace(/^[\t ]*VISUAL\s+PROMPT:.*$/gim, '').trim();
                            return content;
                          })()}
                        </div>

                        {/* Scene images (persisted first, then ephemeral) */}
                        {isDM && (Array.isArray((message as any).images) && (message as any).images.length > 0) && (
                          <div className="mt-2 space-y-2">
                            {((message as any).images as any[]).map((img, idx) => (
                              <img key={`${messageId}-img-${idx}`} src={img.url} alt="Scene" className="rounded-md shadow-md max-h-[420px] w-full object-cover border border-white/20" />
                            ))}
                          </div>
                        )}
                        {isDM && !((message as any).images && (message as any).images.length > 0) && imageByMessage[messageId]?.url && (
                          <div className="mt-2">
                            <img
                              src={imageByMessage[messageId].url}
                              alt="Scene"
                              className="rounded-md shadow-md max-h-[420px] w-full object-cover border border-white/20"
                            />
                          </div>
                        )}

                        {/* Generate/Regenerate button for DM messages (last in group) */}
                        {isDM && isLastInGroup && (
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleGenerateScene(message as any)}
                              disabled={generatingFor.has(messageId)}
                              className="h-8 px-2 py-1"
                            >
                              {generatingFor.has(messageId) ? (
                                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating...</span>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  {imageByMessage[messageId]?.url ? <RefreshCw className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                                  {imageByMessage[messageId]?.url ? 'Regenerate image' : 'Generate scene image'}
                                </span>
                              )}
                            </Button>
                            {genErrorByMessage[messageId] && (
                              <span className="text-xs text-red-300">{genErrorByMessage[messageId]}</span>
                            )}
                          </div>
                        )}

                        {/* Truncation expander */}
                        {isLongMessage && (
                          <button
                            onClick={toggleExpanded}
                            className="text-xs text-primary hover:underline mt-1 inline-block"
                          >
                            {isExpanded ? 'Read less' : 'Read more'}
                          </button>
                        )}

                        {/* Metadata - only show on first message */}
                        {isFirstInGroup && message.context && (
                          <div className="mt-2 pt-2 border-t border-border/20 space-y-1 text-xs opacity-80">
                            {message.context.emotion && (
                              <div className="flex items-center">
                                <span className="font-medium mr-1">🎭</span>
                                <span>{message.context.emotion}</span>
                              </div>
                            )}
                            {message.context.location && (
                              <div className="flex items-center">
                                <span className="font-medium mr-1">📍</span>
                                <span>{message.context.location}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Voice Controls - only on last DM message */}
                        {isDM && isLastInGroup && (
                          <div className="absolute bottom-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DMMessageVoiceControls
                              messageId={messageId}
                              messageText={parsedMessage ? parsedMessage.content : message.text}
                              narrationSegments={message.narrationSegments as any}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Shared elements for group - options/rolls on last message only */}
                    {isLastInGroup && (
                      <>
                        {/* Action Options - render inline for DM bubbles */}
                        {isDM && parsedMessage && parsedMessage.hasOptions && (
                          <div className="w-full max-w-md mt-3">
                            <ActionOptions
                              options={parsedMessage.options}
                              onOptionSelect={(option) => handleOptionSelect(createPlayerMessageFromOption(option))}
                              delay={dynamicOptions?.key === messageId ? 0 : 10000}
                            />
                          </div>
                        )}

                        {/* Note: Dice Roll Requests are now handled globally by GameContext */}
                        {/* Individual message-based roll requests no longer create popups */}
                        {/* The GameContext manages the dice roll queue to prevent duplicates */}

                        {/* Timestamp - only on last message */}
                        <div className={`text-xs message-meta px-2 ${group.isPlayer ? 'text-right' : 'text-left'} mt-1`}>
                          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Global Dice Roll Request - Shows current roll from GameContext queue */}
      {(() => {
        const currentRoll = getCurrentDiceRoll();
        if (!currentRoll) return null;

        return (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
            <DiceRollRequest
              request={{
                type: currentRoll.requestType as any,
                formula: `${currentRoll.rollConfig.count}d${currentRoll.rollConfig.dieType}${currentRoll.rollConfig.modifier >= 0 ? '+' : ''}${currentRoll.rollConfig.modifier}`,
                purpose: currentRoll.description,
                advantage: currentRoll.rollConfig.advantage,
                disadvantage: currentRoll.rollConfig.disadvantage
              }}
              onRoll={handleDiceRoll}
              onManualResult={handleManualResult}
              onCancel={() => cancelDiceRoll(currentRoll.id)}
              className="shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
            />
          </div>
        );
      })()}

      {/* Loading state */}
      {messages?.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-infinite-purple to-infinite-teal rounded-full flex items-center justify-center mb-6 animate-pulse">
            <span className="text-2xl">🎭</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce"></div>
            </div>
            <h3 className="text-lg font-medium text-card-foreground">Your adventure awaits...</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              The Dungeon Master is crafting your opening scene and preparing your world.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
