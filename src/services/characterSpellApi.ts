import { Spell } from '../types/character';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

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
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8888';

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    // Try to get fresh session
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      logger.error('[CharacterSpellService] Error refreshing token:', error);
      throw new Error('Failed to refresh authentication. Please log in again.');
    }

    const token = session?.access_token;

    if (!token) {
      throw new Error('No authentication token found. Please log in.');
    }

    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // If 401, try refreshing the session once more
      if (response.status === 401) {
        logger.warn('[CharacterSpellService] Got 401, attempting token refresh...');
        const { data: { session: freshSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !freshSession?.access_token) {
          throw new Error('Authentication expired. Please log in again.');
        }
        
        // Retry with fresh token
        const retryResponse = await fetch(`${this.baseUrl}${url}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freshSession.access_token}`,
            ...options.headers,
          },
        });
        
        if (!retryResponse.ok) {
          const retryError = await retryResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(retryError.error || `Request failed: ${retryResponse.status} ${retryResponse.statusText}`);
        }
        
        return retryResponse;
      }
      
      throw new Error(error.error || `Request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  async getCharacterSpells(characterId: string): Promise<CharacterSpellsResponse> {
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
    const response = await this.fetchWithAuth(`/v1/characters/${characterId}/spells`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response.json();
  }

  async deleteCharacterSpell(characterId: string, spellId: string): Promise<void> {
    await this.fetchWithAuth(`/v1/characters/${characterId}/spells/${spellId}`, {
      method: 'DELETE',
    });
  }

  async updateSpellPreparation(
    characterId: string,
    spellId: string,
    isPrepared: boolean
  ): Promise<void> {
    await this.fetchWithAuth(`/v1/characters/${characterId}/spells/${spellId}/preparation`, {
      method: 'PATCH',
      body: JSON.stringify({ is_prepared: isPrepared }),
    });
  }
}

export const characterSpellService = new CharacterSpellService();