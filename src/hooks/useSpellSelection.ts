import { useState, useEffect, useMemo } from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Spell, Character } from '@/types/character';
import { getClassSpells } from '@/data/spellOptions';
import {
  validateSpellSelection,
  getSpellcastingInfo,
  getRacialSpells,
  SpellValidationResult
} from '@/utils/spell-validation';
import { SpellFilters } from '@/components/spells/SpellFilterPanel';

interface UseSpellSelectionReturn {
  // Character and class info
  character: Character | null;
  isSpellcaster: boolean;
  spellcastingInfo: ReturnType<typeof getSpellcastingInfo>;

  // Available spells
  availableCantrips: Spell[];
  availableSpells: Spell[];
  racialSpells: ReturnType<typeof getRacialSpells>;

  // Current selections
  selectedCantrips: string[];
  selectedSpells: string[];

  // Selection actions
  toggleCantrip: (cantripId: string) => void;
  toggleSpell: (spellId: string) => void;
  clearSelections: () => void;

  // Filtering
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: SpellFilters;
  setFilters: (filters: SpellFilters) => void;
  filteredCantrips: Spell[];
  filteredSpells: Spell[];

  // Validation
  validation: SpellValidationResult;
  canProceed: boolean;

  // Save to character
  updateCharacterSpells: () => void;
}

/**
 * useSpellSelection - Custom hook for managing spell selection
 * Features:
 * - Centralized spell selection state management
 * - Real-time validation with D&D 5E rules
 * - Search and filtering functionality
 * - Integration with character context
 * - Racial spell handling
 * - Validation feedback
 */
export function useSpellSelection(): UseSpellSelectionReturn {
  const { state, dispatch } = useCharacter();
  const character = state.character;

  // Selection state
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>([]);
  const [selectedSpells, setSelectedSpells] = useState<string[]>([]);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SpellFilters>({
    schools: [],
    components: {
      verbal: false,
      somatic: false,
      material: false
    },
    properties: {
      concentration: false,
      ritual: false,
      damage: false
    }
  });

  // Initialize from character data
  useEffect(() => {
    if (character) {
      setSelectedCantrips(character.cantrips || []);
      setSelectedSpells(character.knownSpells || []);
    }
  }, [character?.id]); // Only reset when character changes

  // Character and spellcasting info
  const currentClass = character?.class;
  const isSpellcaster = !!currentClass?.spellcasting;
  const spellcastingInfo = useMemo(() => {
    return currentClass ? getSpellcastingInfo(currentClass, character?.level || 1) : null;
  }, [currentClass, character?.level]);

  // Available spells
  const { availableCantrips, availableSpells } = useMemo(() => {
    if (!isSpellcaster || !currentClass) {
      return { availableCantrips: [], availableSpells: [] };
    }

    const { cantrips, spells } = getClassSpells(currentClass.name);
    return {
      availableCantrips: cantrips,
      availableSpells: spells
    };
  }, [isSpellcaster, currentClass?.name]);

  // Racial spells
  const racialSpells = useMemo(() => {
    if (!character) {
      return { cantrips: [], spells: [], bonusCantrips: 0 };
    }

    return getRacialSpells(character.race?.name || '', character.subrace);
  }, [character?.race?.name, character?.subrace?.name]);

  // Spell filtering function
  const filterSpells = (spells: Spell[], searchTerm: string, filters: SpellFilters): Spell[] => {
    return spells.filter(spell => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          spell.name.toLowerCase().includes(searchLower) ||
          spell.description.toLowerCase().includes(searchLower) ||
          spell.school.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // School filter
      if (filters.schools.length > 0 && !filters.schools.includes(spell.school)) {
        return false;
      }

      // Component filters
      if (filters.components.verbal && !spell.verbal) return false;
      if (filters.components.somatic && !spell.somatic) return false;
      if (filters.components.material && !spell.material) return false;

      // Property filters
      if (filters.properties.concentration && !spell.concentration) return false;
      if (filters.properties.ritual && !spell.ritual) return false;
      if (filters.properties.damage && !spell.damage) return false;

      return true;
    });
  };

  // Filtered spells
  const filteredCantrips = useMemo(() => {
    return filterSpells(availableCantrips, searchTerm, filters);
  }, [availableCantrips, searchTerm, filters]);

  const filteredSpells = useMemo(() => {
    return filterSpells(availableSpells, searchTerm, filters);
  }, [availableSpells, searchTerm, filters]);

  // Selection actions
  const toggleCantrip = (cantripId: string) => {
    setSelectedCantrips(prev => {
      if (prev.includes(cantripId)) {
        return prev.filter(id => id !== cantripId);
      } else {
        // Check if we've reached the limit
        const maxCantrips = (spellcastingInfo?.cantripsKnown || 0) + racialSpells.cantrips.length + racialSpells.bonusCantrips;
        if (prev.length >= maxCantrips) {
          return prev; // Don't add if at limit
        }
        return [...prev, cantripId];
      }
    });
  };

  const toggleSpell = (spellId: string) => {
    setSelectedSpells(prev => {
      if (prev.includes(spellId)) {
        return prev.filter(id => id !== spellId);
      } else {
        // Check if we've reached the limit
        const maxSpells = spellcastingInfo?.spellsKnown || 0;
        if (prev.length >= maxSpells) {
          return prev; // Don't add if at limit
        }
        return [...prev, spellId];
      }
    });
  };

  const clearSelections = () => {
    setSelectedCantrips([]);
    setSelectedSpells([]);
  };

  // Validation
  const validation = useMemo(() => {
    if (!character) {
      return { valid: false, errors: [], warnings: [] };
    }

    return validateSpellSelection(character, selectedCantrips, selectedSpells);
  }, [character, selectedCantrips, selectedSpells]);

  const canProceed = validation.valid;

  // Save to character
  const updateCharacterSpells = () => {
    if (!character || !validation.valid) {
      return;
    }

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        cantrips: selectedCantrips,
        knownSpells: selectedSpells,
      },
    });
  };

  return {
    // Character and class info
    character,
    isSpellcaster,
    spellcastingInfo,

    // Available spells
    availableCantrips,
    availableSpells,
    racialSpells,

    // Current selections
    selectedCantrips,
    selectedSpells,

    // Selection actions
    toggleCantrip,
    toggleSpell,
    clearSelections,

    // Filtering
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    filteredCantrips,
    filteredSpells,

    // Validation
    validation,
    canProceed,

    // Save to character
    updateCharacterSpells
  };
}