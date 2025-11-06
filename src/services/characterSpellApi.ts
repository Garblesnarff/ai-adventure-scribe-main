import { Spell } from '../types/character';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

const parseBooleanFlag = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }
  return fallback;
};

export class SpellApiDisabledError extends Error {
  constructor(message = 'Spell API disabled') {
    super(message);
    this.name = 'SpellApiDisabledError';
  }
}

export interface CharacterSpellData extends Spell {
  is_prepared: boolean;
  source_feature: string;
}

export interface CharacterSpellsResponse {
  character: {
    id: string;
    class: string;
    level: number;
  };
  cantrips: CharacterSpellData[];
  spells: CharacterSpellData[];
  total_spells: number;
}

export interface SaveSpellsRequest {
  spells: string[];
  className: string;
}

export interface SaveSpellsResponse {
  success: boolean;
  message: string;
}

class CharacterSpellService {
  private readonly enabled = parseBooleanFlag((import.meta as any)?.env?.VITE_ENABLE_SPELL_API ?? false);
  private readonly baseUrl =
    (import.meta as any)?.env?.VITE_SPELL_API_URL || (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:8888';

  isEnabled() {
    return this.enabled;
  }

  private ensureEnabled() {
    if (!this.enabled) {
      throw new SpellApiDisabledError();
    }
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        logger.warn('[CharacterSpellService] Error retrieving current session', error);
      }

      const token = data?.session?.access_token;
      if (token) {
        return token;
      }
    }

    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      logger.error('[CharacterSpellService] Error refreshing token:', refreshError);
      throw new Error('Failed to refresh authentication. Please log in again.');
    }

    const refreshedToken = refreshData.session?.access_token;

    if (!refreshedToken) {
      throw new Error('No authentication token found. Please log in.');
    }

    return refreshedToken;
  }

  private async executeRequest(url: string, options: RequestInit, token: string): Promise<Response> {
    return fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
  }

  private async parseError(response: Response): Promise<string> {
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    const rawMessage = body?.error || body?.message || `Request failed: ${response.status} ${response.statusText}`;

    if (response.status === 401 && typeof rawMessage === 'string' && rawMessage.toLowerCase().includes('invalid token')) {
      return 'Authentication expired. Please sign in again.';
    }

    return typeof rawMessage === 'string' ? rawMessage : 'Unknown error';
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}, allowRetry = true): Promise<Response> {
    this.ensureEnabled();
    try {
      const initialToken = await this.getAccessToken();
      let response = await this.executeRequest(url, options, initialToken);

      if (response.status === 401 && allowRetry) {
        logger.warn('[CharacterSpellService] Got 401, attempting token refresh...');
        try {
          const refreshedToken = await this.getAccessToken(true);
          response = await this.executeRequest(url, options, refreshedToken);
        } catch (error) {
          logger.warn('[CharacterSpellService] Token refresh failed, signing out user.');
          await supabase.auth.signOut();
          throw error instanceof Error ? error : new Error('Authentication expired. Please log in again.');
        }

        if (response.status === 401) {
          logger.warn('[CharacterSpellService] Token refresh did not resolve 401, signing out user.');
          await supabase.auth.signOut();
          throw new Error('Your session has expired. Please sign in again.');
        }
      }

      if (!response.ok) {
        const message = await this.parseError(response);
        throw new Error(message);
      }

      return response;
    } catch (error) {
      logger.warn('[CharacterSpellService] Authenticated request failed:', error);
      throw error;
    }
  }

  async getCharacterSpells(characterId: string): Promise<CharacterSpellsResponse> {
    this.ensureEnabled();
    try {
      const response = await this.fetchWithAuth(`/v1/characters/${characterId}/spells`);
      return response.json();
    } catch (error) {
      logger.warn(`[CharacterSpellService] Failed to fetch spells for character ${characterId}:`, error);

      if (error instanceof Error && error.message.includes('Character not found')) {
        return {
          character: {
            id: characterId,
            class: 'Unknown',
            level: 1
          },
          cantrips: [],
          spells: [],
          total_spells: 0
        };
      }

      throw error;
    }
  }

  async saveCharacterSpells(
    characterId: string,
    request: SaveSpellsRequest
  ): Promise<SaveSpellsResponse> {
    this.ensureEnabled();
    const response = await this.fetchWithAuth(`/v1/characters/${characterId}/spells`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response.json();
  }

  async deleteCharacterSpell(characterId: string, spellId: string): Promise<void> {
    this.ensureEnabled();
    await this.fetchWithAuth(`/v1/characters/${characterId}/spells/${spellId}`, {
      method: 'DELETE',
    });
  }

  async updateSpellPreparation(
    characterId: string,
    spellId: string,
    isPrepared: boolean
  ): Promise<void> {
    this.ensureEnabled();
    await this.fetchWithAuth(`/v1/characters/${characterId}/spells/${spellId}/preparation`, {
      method: 'PATCH',
      body: JSON.stringify({ is_prepared: isPrepared }),
    });
  }
}

export const characterSpellService = new CharacterSpellService();