import { localSpellService } from './localSpellService';

import type { Spell } from '@/types/character';

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888';

interface ApiSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  ritual: boolean;
  concentration: boolean;
  casting_time: string;
  range_text: string;
  duration: string;
  description: string;
  components_verbal: boolean;
  components_somatic: boolean;
  components_material: boolean;
  material_components?: string;
  attack_save?: string;
  damage_effect?: string;
  available_classes?: string[];
  source_feature?: string;
}

interface SpellProgression {
  character_level: number;
  cantrips_known: number;
  spells_known?: number;
  spells_prepared_formula?: string;
  spell_slots_1: number;
  spell_slots_2: number;
  spell_slots_3: number;
  spell_slots_4: number;
  spell_slots_5: number;
  spell_slots_6: number;
  spell_slots_7: number;
  spell_slots_8: number;
  spell_slots_9: number;
}

interface SpellcastingClass {
  id: string;
  name: string;
  spellcasting_ability: string;
  caster_type: 'full' | 'half' | 'third' | 'pact';
  spell_slots_start_level: number;
}

interface MulticlassSpellSlots {
  caster_level: number;
  spell_slots_1: number;
  spell_slots_2: number;
  spell_slots_3: number;
  spell_slots_4: number;
  spell_slots_5: number;
  spell_slots_6: number;
  spell_slots_7: number;
  spell_slots_8: number;
  spell_slots_9: number;
}

interface MulticlassCalculation {
  totalCasterLevel: number;
  spellSlots: MulticlassSpellSlots | null;
  pactMagicSlots: { level: number; slots: number } | null;
}

interface ServerSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  description: string;
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  materialComponents?: string;
  concentration: boolean;
  ritual: boolean;
  damage?: boolean;
  attackSave?: string;
  damageEffect?: string;
}

// Convert API spell to frontend Spell type
function convertApiSpellToSpell(apiSpell: ServerSpell): Spell {
  // The server returns spell objects directly from spellData.ts, not in API format
  // So the properties are: castingTime (not casting_time), verbal (not components_verbal), etc.
  return {
    id: apiSpell.id,
    name: apiSpell.name,
    level: apiSpell.level,
    school: apiSpell.school,
    castingTime: apiSpell.castingTime,
    range: apiSpell.range,
    duration: apiSpell.duration,
    description: apiSpell.description,
    verbal: apiSpell.verbal,
    somatic: apiSpell.somatic,
    material: apiSpell.material,
    materialComponents: apiSpell.materialComponents || '',
    concentration: apiSpell.concentration,
    ritual: apiSpell.ritual,
    damage: apiSpell.damage || false,
    attackSave: apiSpell.attackSave || '',
    damageEffect: apiSpell.damageEffect || '',
  };
}

class SpellApiService {
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
        logger.warn('API unavailable, switching to local spell data');
        this.useLocalFallback = true;
      }
      throw error;
    }
  }

  private async tryApiWithFallback<T>(
    apiCall: () => Promise<T>,
    fallbackCall: () => Promise<T>,
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      logger.info('API call failed, using local fallback:', error);
      return await fallbackCall();
    }
  }

  // Get all spells with optional filtering
  async getAllSpells(filters?: {
    level?: number;
    school?: string;
    class?: string;
    ritual?: boolean;
    components?: string;
  }): Promise<Spell[]> {
    return this.tryApiWithFallback(
      async () => {
        const params = new URLSearchParams();

        if (filters?.level !== undefined) params.append('level', filters.level.toString());
        if (filters?.school) params.append('school', filters.school);
        if (filters?.class) params.append('class', filters.class);
        if (filters?.ritual !== undefined) params.append('ritual', String(filters.ritual));
        if (filters?.components) params.append('components', filters.components);

        const url = `/v1/spells${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await this.fetchWithAuth(url);
        const apiSpells: ServerSpell[] = await response.json();

        return apiSpells.map(convertApiSpellToSpell);
      },
      () => localSpellService.getAllSpells(filters),
    );
  }

  // Get spells available to a specific class at a specific level
  async getClassSpells(
    className: string,
    level: number = 1,
  ): Promise<{ cantrips: Spell[]; spells: Spell[] }> {
    return this.tryApiWithFallback(
      async () => {
        const response = await this.fetchWithAuth(
          `/v1/spells/class/${encodeURIComponent(className)}/level/${level}`,
        );
        const apiSpells: ServerSpell[] = await response.json();

        const allSpells = apiSpells.map(convertApiSpellToSpell);

        return {
          cantrips: allSpells.filter((spell) => spell.level === 0),
          spells: allSpells.filter((spell) => spell.level > 0),
        };
      },
      () => localSpellService.getClassSpells(className, level),
    );
  }

  // Get spell progression for a class
  async getSpellProgression(className: string): Promise<SpellProgression[]> {
    return this.tryApiWithFallback(
      async () => {
        const response = await this.fetchWithAuth(
          `/v1/spells/progression/${encodeURIComponent(className)}`,
        );
        return response.json();
      },
      () => localSpellService.getSpellProgression(className),
    );
  }

  // Get multiclass spell slots
  async getMulticlassSpellSlots(casterLevel: number): Promise<MulticlassSpellSlots> {
    return this.tryApiWithFallback(
      async () => {
        const response = await this.fetchWithAuth(`/v1/spells/multiclass/slots/${casterLevel}`);
        return response.json();
      },
      () => localSpellService.getMulticlassSpellSlots(casterLevel),
    );
  }

  // Get all spellcasting classes
  async getSpellcastingClasses(): Promise<SpellcastingClass[]> {
    return this.tryApiWithFallback(
      async () => {
        const response = await this.fetchWithAuth('/v1/spells/classes');
        return response.json();
      },
      () => localSpellService.getSpellcastingClasses(),
    );
  }

  // Calculate multiclass caster level and spell slots
  async calculateMulticlassCasterLevel(
    classLevels: { className: string; level: number }[],
  ): Promise<MulticlassCalculation> {
    return this.tryApiWithFallback(
      async () => {
        const response = await this.fetchWithAuth('/v1/spells/multiclass/calculate', {
          method: 'POST',
          body: JSON.stringify({ classLevels }),
        });
        return response.json();
      },
      () => localSpellService.calculateMulticlassCasterLevel(classLevels),
    );
  }

  // Get a specific spell by ID
  async getSpellById(spellId: string): Promise<Spell> {
    return this.tryApiWithFallback(
      async () => {
        const response = await this.fetchWithAuth(`/v1/spells/${spellId}`);
        const apiSpell: ServerSpell = await response.json();
        return convertApiSpellToSpell(apiSpell);
      },
      () => localSpellService.getSpellById(spellId),
    );
  }
}

// Export singleton instance
export const spellApi = new SpellApiService();

// Export types for use in other files
export type { SpellProgression, SpellcastingClass, MulticlassSpellSlots, MulticlassCalculation };
