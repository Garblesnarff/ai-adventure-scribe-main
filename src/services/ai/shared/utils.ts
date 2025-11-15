/**
 * Shared utility functions for AI service modules
 * Extracted from ai-service.ts for reusability
 */

import type { ClassEquipment } from './types';

import { getGeminiApiManager, type GeminiApiManager } from '@/infrastructure/ai';
import logger from '@/lib/logger';

// In-flight request deduplication with 2s TTL
const inFlight = new Map<string, { ts: number; promise: Promise<any> }>();
const DEDUPE_MS = 2000;

/**
 * Generate cache key for deduplication
 */
export function keyFor(sessionId: string | undefined, message: string, historyLen: number): string {
  return `${sessionId || 'nosession'}|${message.slice(0, 256)}|${historyLen}`;
}

/**
 * Get or create deduplicated promise
 */
export function getOrCreateDeduped<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const now = Date.now();

  // Clean up expired entries
  for (const [k, v] of inFlight) {
    if (now - v.ts > DEDUPE_MS) {
      inFlight.delete(k);
    }
  }

  // Return existing if found
  if (inFlight.has(key)) {
    logger.debug('[AIService] Deduping in-flight call:', key);
    return inFlight.get(key)!.promise as Promise<T>;
  }

  // Create new promise
  const promise = factory();
  inFlight.set(key, { ts: now, promise });

  return promise;
}

/**
 * Get the shared Gemini API manager instance
 */
export function getGeminiManager(): GeminiApiManager {
  return getGeminiApiManager();
}

/**
 * Check if CrewAI feature flag is enabled
 */
export function useCrewAI(): boolean {
  try {
    const raw = String((import.meta as any).env?.VITE_USE_CREWAI_DM ?? '')
      .toLowerCase()
      .trim();
    return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
  } catch {
    return false;
  }
}

/**
 * Get default equipment for a character class
 * Used to provide the AI with weapon damage dice information
 */
export function getClassEquipment(className: string): ClassEquipment {
  const classLower = className.toLowerCase();

  switch (classLower) {
    case 'fighter':
      return {
        weapons: ['Longsword (1d8)', 'Shortsword (1d6)', 'Handaxe (1d6)', 'Light Crossbow (1d8)'],
        armor: 'Chain mail (AC 16)',
      };

    case 'rogue':
      return {
        weapons: ['Shortsword (1d6)', 'Dagger (1d4)', 'Shortbow (1d6)', 'Rapier (1d8)'],
        armor: 'Leather armor (AC 11)',
      };

    case 'ranger':
      return {
        weapons: ['Longsword (1d8)', 'Shortsword (1d6)', 'Longbow (1d8)', 'Handaxe (1d6)'],
        armor: 'Studded leather (AC 12)',
      };

    case 'barbarian':
      return {
        weapons: ['Greataxe (1d12)', 'Handaxe (1d6)', 'Javelin (1d6)'],
        armor: 'Unarmored (AC 10 + Dex + Con)',
      };

    case 'wizard':
      return {
        weapons: ['Dagger (1d4)', 'Dart (1d4)', 'Light Crossbow (1d8)', 'Quarterstaff (1d6)'],
        armor: 'No armor (AC 10)',
      };

    case 'sorcerer':
      return {
        weapons: ['Dagger (1d4)', 'Dart (1d4)', 'Light Crossbow (1d8)', 'Quarterstaff (1d6)'],
        armor: 'No armor (AC 10)',
      };

    case 'warlock':
      return {
        weapons: ['Dagger (1d4)', 'Light Crossbow (1d8)', 'Scimitar (1d6)'],
        armor: 'Leather armor (AC 11)',
      };

    case 'cleric':
      return {
        weapons: ['Mace (1d6)', 'Warhammer (1d8)', 'Light Crossbow (1d8)', 'Shield'],
        armor: 'Scale mail (AC 14)',
      };

    case 'druid':
      return {
        weapons: ['Scimitar (1d6)', 'Shield', 'Dart (1d4)', 'Javelin (1d6)'],
        armor: 'Leather armor (AC 11)',
      };

    case 'paladin':
      return {
        weapons: ['Longsword (1d8)', 'Javelin (1d6)', 'Shield'],
        armor: 'Chain mail (AC 16)',
      };

    case 'bard':
      return {
        weapons: ['Rapier (1d8)', 'Shortsword (1d6)', 'Dagger (1d4)', 'Hand Crossbow (1d6)'],
        armor: 'Leather armor (AC 11)',
      };

    case 'monk':
      return {
        weapons: ['Shortsword (1d6)', 'Dart (1d4)', 'Unarmed Strike (1d4)'],
        armor: 'Unarmored (AC 10 + Dex + Wis)',
      };

    default:
      return {
        weapons: ['Longsword (1d8)', 'Shortsword (1d6)', 'Dagger (1d4)'],
        armor: 'Leather armor (AC 11)',
      };
  }
}

/**
 * Add equipment context to prompt
 */
export function addEquipmentContext(char: any): string {
  const classEquipment = getClassEquipment(char.class?.name || char.class || 'Fighter');
  return `
<equipment>
${classEquipment.weapons.join(', ')} | ${classEquipment.armor}
**CRITICAL: USE EXACT WEAPON DICE from equipment list above for damage roll requests!**
</equipment>`;
}
