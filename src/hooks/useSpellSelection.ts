import { useState, useEffect, useMemo } from 'react';

import type { SpellFilters } from '@/components/spells/SpellFilterPanel';
import type { Spell, Character } from '@/types/character';
import type { SpellValidationResult } from '@/utils/spell-validation';

import { useCharacter } from '@/contexts/CharacterContext';
import logger from '@/lib/logger';
import { characterSpellService } from '@/services/characterSpellApi';
import { spellApi } from '@/services/spellApi';
import {
  validateSpellSelection,
  getSpellcastingInfo,
  getRacialSpells,
  validateSpellSelectionAsync,
} from '@/utils/spell-validation';

interface UseSpellSelectionReturn {
  // Character and class info
  character: Character | null;
  isSpellcaster: boolean;
  spellcastingInfo: ReturnType<typeof getSpellcastingInfo>;

  // Available spells
  availableCantrips: Spell[];
  availableSpells: Spell[];
  racialSpells: ReturnType<typeof getRacialSpells>;

  // Loading states
  isLoadingSpells: boolean;
  spellsError: string | null;

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

  // Save to character and database
  updateCharacterSpells: () => Promise<void>;
  isSavingSpells: boolean;

  // Retry functionality
  refetchSpells: () => Promise<void>;
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

  // Loading state
  const [isLoadingSpells, setIsLoadingSpells] = useState(false);
  const [spellsError, setSpellsError] = useState<string | null>(null);
  const [availableCantrips, setAvailableCantrips] = useState<Spell[]>([]);
  const [availableSpells, setAvailableSpells] = useState<Spell[]>([]);
  const [isSavingSpells, setIsSavingSpells] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SpellFilters>({
    schools: [],
    components: {
      verbal: false,
      somatic: false,
      material: false,
    },
    properties: {
      concentration: false,
      ritual: false,
      damage: false,
    },
  });

  // Initialize from character data
  useEffect(() => {
    if (character) {
      logger.debug('🎯 [useSpellSelection] Initializing spell selection from character:', {
        characterId: character.id,
        cantrips: character.cantrips,
        knownSpells: character.knownSpells,
      });
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

  // Spell fetching function
  const fetchSpells = async () => {
    if (!isSpellcaster || !currentClass?.name) {
      logger.debug(
        '🚫 [useSpellSelection] Not a spellcaster or no class name, skipping spell fetch',
      );
      setAvailableCantrips([]);
      setAvailableSpells([]);
      return;
    }

    setIsLoadingSpells(true);
    setSpellsError(null);

    logger.debug('🔍 [useSpellSelection] Fetching spells for class:', {
      className: currentClass.name,
      characterLevel: character?.level || 1,
      isSpellcaster,
      spellcastingInfo,
    });

    try {
      const { cantrips, spells } = await spellApi.getClassSpells(
        currentClass.name,
        character?.level || 1,
      );

      logger.debug('✅ [useSpellSelection] Spells fetched successfully:', {
        className: currentClass.name,
        cantripsFound: cantrips.length,
        spellsFound: spells.length,
        cantripNames: cantrips.slice(0, 3).map((c) => c.name),
        spellNames: spells.slice(0, 3).map((s) => s.name),
      });

      setAvailableCantrips(cantrips);
      setAvailableSpells(spells);
    } catch (error) {
      logger.error('Failed to fetch spells:', error);
      setSpellsError(error instanceof Error ? error.message : 'Failed to load spells');
      setAvailableCantrips([]);
      setAvailableSpells([]);
    } finally {
      setIsLoadingSpells(false);
    }
  };

  // Fetch available spells from API
  useEffect(() => {
    fetchSpells();
  }, [isSpellcaster, currentClass?.name, character?.level]);

  // Racial spells
  const racialSpells = useMemo(() => {
    if (!character) {
      return { cantrips: [], spells: [], bonusCantrips: 0 };
    }

    return getRacialSpells(character.race?.name || '', character.subrace || undefined);
  }, [character?.race?.name, character?.subrace]);

  // Spell filtering function
  const filterSpells = (spells: Spell[], searchTerm: string, filters: SpellFilters): Spell[] => {
    return spells.filter((spell) => {
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
      if (filters.components.verbal && !spell.components_verbal) return false;
      if (filters.components.somatic && !spell.components_somatic) return false;
      if (filters.components.material && !spell.components_material) return false;

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
    setSelectedCantrips((prev) => {
      if (prev.includes(cantripId)) {
        return prev.filter((id) => id !== cantripId);
      } else {
        // Check if we've reached the limit
        const maxCantrips =
          (spellcastingInfo?.cantripsKnown || 0) +
          racialSpells.cantrips.length +
          racialSpells.bonusCantrips;
        if (prev.length >= maxCantrips) {
          return prev; // Don't add if at limit
        }
        return [...prev, cantripId];
      }
    });
  };

  const toggleSpell = (spellId: string) => {
    logger.debug('🪄 [useSpellSelection] toggleSpell called:', spellId);
    setSelectedSpells((prev) => {
      const isRemoving = prev.includes(spellId);
      const maxSpells = spellcastingInfo?.spellsKnown || 0;

      let newSelection: string[];
      if (isRemoving) {
        newSelection = prev.filter((id) => id !== spellId);
      } else {
        // Check if we've reached the limit
        if (prev.length >= maxSpells) {
          logger.warn('🚫 [useSpellSelection] Spell limit reached, cannot add more spells');
          return prev; // Don't add if at limit
        }
        newSelection = [...prev, spellId];
      }

      logger.debug('🪄 [useSpellSelection] selectedSpells updated:', {
        action: isRemoving ? 'removed' : 'added',
        spellId,
        previousCount: prev.length,
        newCount: newSelection.length,
        newSelection,
      });

      return newSelection;
    });
  };

  const clearSelections = () => {
    setSelectedCantrips([]);
    setSelectedSpells([]);
  };

  // Validation
  const [validation, setValidation] = useState<ReturnType<typeof validateSpellSelection>>({
    valid: false,
    errors: [],
    warnings: [],
  });
  const [isValidating, setIsValidating] = useState(false);

  // Perform async validation when character, selections, or available spells change
  useEffect(() => {
    let mounted = true;

    const runValidation = async () => {
      if (!character) {
        setValidation({ valid: false, errors: [], warnings: [] });
        return;
      }

      setIsValidating(true);

      const availableCantripIds = availableCantrips.map((c) => c.id);
      const availableSpellIds = availableSpells.map((s) => s.id);

      try {
        const result = await validateSpellSelectionAsync(
          character,
          selectedCantrips,
          selectedSpells,
          availableCantripIds,
          availableSpellIds,
        );
        if (mounted) setValidation(result);
      } catch (error) {
        logger.error('Async spell validation failed:', error);
        // Fall back to synchronous validation
        const result = validateSpellSelection(
          character,
          selectedCantrips,
          selectedSpells,
          availableCantripIds,
          availableSpellIds,
        );
        if (mounted) setValidation(result);
      } finally {
        if (mounted) setIsValidating(false);
      }
    };

    runValidation();

    return () => {
      mounted = false;
    };
  }, [character, selectedCantrips, selectedSpells, availableCantrips, availableSpells]);

  const canProceed = validation.valid && !isValidating;

  // Save to character and database
  const updateCharacterSpells = async () => {
    if (!character || !character.id) {
      return;
    }

    // Do not save or dispatch if current selection is invalid
    if (!validation.valid) {
      return;
    }

    setIsSavingSpells(true);
    try {
      // Combine cantrips and spells for API call
      const allSpells = [...selectedCantrips, ...selectedSpells];

      // Save to database first
      await characterSpellService.saveCharacterSpells(character.id, {
        spells: allSpells,
        className: character.class?.name || '',
      });

      // Then update local context
      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: {
          cantrips: selectedCantrips,
          knownSpells: selectedSpells,
        },
      });
    } catch (error) {
      logger.error('Failed to save character spells:', error);
      setSpellsError(error instanceof Error ? error.message : 'Failed to save spells');
      throw error; // Re-throw so calling components can handle
    } finally {
      setIsSavingSpells(false);
    }
  };

  // Auto-save selections to character immediately when they change
  useEffect(() => {
    if (character) {
      // Only log when there are actual changes to reduce noise
      const currentCantrips = character.cantrips || [];
      const currentSpells = character.knownSpells || [];
      const cantripsChanged =
        JSON.stringify([...selectedCantrips].sort()) !==
        JSON.stringify([...currentCantrips].sort());
      const spellsChanged =
        JSON.stringify([...selectedSpells].sort()) !== JSON.stringify([...currentSpells].sort());

      if (cantripsChanged || spellsChanged) {
        logger.debug('🔄 [useSpellSelection] Auto-saving spell selections to character context:', {
          characterId: character.id,
          cantrips: selectedCantrips,
          knownSpells: selectedSpells,
          cantripCount: selectedCantrips.length,
          spellCount: selectedSpells.length,
        });
        dispatch({
          type: 'UPDATE_CHARACTER',
          payload: {
            cantrips: selectedCantrips,
            knownSpells: selectedSpells,
          },
        });
      }
    }
  }, [selectedCantrips, selectedSpells, character, dispatch]);

  return {
    // Character and class info
    character,
    isSpellcaster,
    spellcastingInfo,

    // Available spells
    availableCantrips,
    availableSpells,
    racialSpells,

    // Loading states
    isLoadingSpells,
    spellsError,

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

    // Save to character and database
    updateCharacterSpells,
    isSavingSpells,

    // Retry functionality
    refetchSpells: fetchSpells,
  };
}
