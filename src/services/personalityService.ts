import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888';

export interface PersonalityElement {
  id: string;
  text: string;
  background?: string;
  source: string;
  alignment?: string;
  created_at: string;
}

export interface BatchPersonalityResponse {
  traits: PersonalityElement;
  traits2?: PersonalityElement;
  ideals: PersonalityElement;
  bonds: PersonalityElement;
  flaws: PersonalityElement;
}

export class PersonalityService {
  private useLocalFallback: boolean = false;

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    // If we've already determined the API is unavailable, skip the API call
    if (this.useLocalFallback) {
      throw new Error('API unavailable, using local fallback');
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      // Check if this is a connection error (backend not running)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        logger.warn('API unavailable, switching to local personality data');
        this.useLocalFallback = true;
      }
      throw error;
    }
  }

  /**
   * Get a random personality element of a specific type
   * @param type - The type of personality element (traits, ideals, bonds, flaws)
   * @param options - Optional filters
   */
  async getRandomPersonalityElement(
    type: 'traits' | 'ideals' | 'bonds' | 'flaws',
    options?: {
      background?: string;
      alignment?: string;
    },
  ): Promise<PersonalityElement> {
    const params = new URLSearchParams();

    if (options?.background) {
      params.append('background', options.background);
    }

    if (options?.alignment) {
      params.append('alignment', options.alignment);
    }

    const queryString = params.toString();
    const url = `/v1/personality/random/${type}${queryString ? `?${queryString}` : ''}`;

    try {
      const response = await this.fetchWithAuth(url);
      const data = await response.json();
      return data.data;
    } catch (error) {
      if (this.useLocalFallback) {
        // Return fallback data when API is unavailable
        return this.getLocalFallbackData(type);
      }
      throw error;
    }
  }

  /**
   * Get random personality elements for all types at once
   * @param options - Optional filters
   */
  async getBatchRandomPersonality(options?: {
    background?: string;
    alignment?: string;
  }): Promise<BatchPersonalityResponse> {
    const params = new URLSearchParams();

    if (options?.background) {
      params.append('background', options.background);
    }

    if (options?.alignment) {
      params.append('alignment', options.alignment);
    }

    const queryString = params.toString();
    const url = `/v1/personality/batch/random${queryString ? `?${queryString}` : ''}`;

    try {
      const response = await this.fetchWithAuth(url);
      const data = await response.json();
      return data.data;
    } catch (error) {
      if (this.useLocalFallback) {
        // Return fallback data when API is unavailable
        return {
          traits: this.getLocalFallbackData('traits'),
          traits2: this.getLocalFallbackData('traits'),
          ideals: this.getLocalFallbackData('ideals'),
          bonds: this.getLocalFallbackData('bonds'),
          flaws: this.getLocalFallbackData('flaws'),
        };
      }
      throw error;
    }
  }

  /**
   * Get all personality elements of a specific type
   * @param type - The type of personality element (traits, ideals, bonds, flaws)
   * @param options - Optional filters and limits
   */
  async getPersonalityElements(
    type: 'traits' | 'ideals' | 'bonds' | 'flaws',
    options?: {
      background?: string;
      limit?: number;
    },
  ): Promise<PersonalityElement[]> {
    const params = new URLSearchParams();

    if (options?.background) {
      params.append('background', options.background);
    }

    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }

    const queryString = params.toString();
    const url = `/v1/personality/${type}${queryString ? `?${queryString}` : ''}`;

    try {
      const response = await this.fetchWithAuth(url);
      const data = await response.json();
      return data.data;
    } catch (error) {
      if (this.useLocalFallback) {
        // Return fallback data when API is unavailable
        return [this.getLocalFallbackData(type)];
      }
      throw error;
    }
  }

  /**
   * Local fallback data when API is unavailable
   */
  private getLocalFallbackData(type: 'traits' | 'ideals' | 'bonds' | 'flaws'): PersonalityElement {
    const fallbackData = {
      traits: [
        "I idolize a particular hero of my faith, and constantly refer to that person's deeds and example.",
        'I can find common ground between the fiercest enemies, empathizing with them and always working toward peace.',
        'I always have a plan for what to do when things go wrong.',
        'I judge people by their actions, not their words.',
      ],
      ideals: [
        'Tradition. The ancient traditions of worship and sacrifice must be preserved and upheld.',
        'Freedom. Chains are meant to be broken, as are those who would forge them.',
        'Respect. People deserve to be treated with dignity and respect.',
      ],
      bonds: [
        'I would die to recover an ancient relic of my faith that was lost long ago.',
        'My ill-gotten gains go to support my family.',
        'I have a family, but I have no idea where they are. One day, I hope to see them again.',
      ],
      flaws: [
        'I judge others harshly, and myself even more severely.',
        "When I see something valuable, I can't think about anything but how to steal it.",
        'The tyrant who rules my land will stop at nothing to see me killed.',
      ],
    };

    const items = fallbackData[type];
    const randomItem = items[Math.floor(Math.random() * items.length)];

    return {
      id: `fallback-${Date.now()}`,
      text: randomItem,
      source: 'PHB',
      created_at: new Date().toISOString(),
    };
  }
}

// Export a singleton instance
export const personalityService = new PersonalityService();
