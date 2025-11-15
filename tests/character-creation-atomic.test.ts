/**
 * Tests for Atomic Character Creation
 *
 * Purpose: Verify that character creation is transactional and rolls back
 * all changes if any step fails.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { supabase } from '@/integrations/supabase/client';

describe('Atomic Character Creation', () => {
  const testUserId = '00000000-0000-0000-0000-000000000000';
  let testCampaignId: string;
  let createdCharacterIds: string[] = [];

  beforeEach(async () => {
    // Create a test campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        name: 'Test Campaign for Atomic Creation',
        user_id: testUserId,
        description: 'Test campaign'
      })
      .select()
      .single();

    if (error) throw error;
    testCampaignId = campaign.id;
  });

  afterEach(async () => {
    // Cleanup: Delete all test characters
    if (createdCharacterIds.length > 0) {
      await supabase
        .from('characters')
        .delete()
        .in('id', createdCharacterIds);
    }

    // Cleanup: Delete test campaign
    if (testCampaignId) {
      await supabase
        .from('campaigns')
        .delete()
        .eq('id', testCampaignId);
    }

    createdCharacterIds = [];
  });

  describe('Successful Creation', () => {
    it('should create character with all data atomically', async () => {
      const characterData = {
        user_id: testUserId,
        campaign_id: testCampaignId,
        name: 'Test Wizard',
        race: 'Human',
        class: 'Wizard',
        level: 1,
        alignment: 'Neutral Good',
        experience_points: 0,
        appearance: 'A young human with scholarly robes',
        personality_traits: 'Curious and methodical',
        backstory_elements: 'Studied at the academy',
        background: 'Sage',
        skill_proficiencies: 'Arcana,History',
        tool_proficiencies: '',
        saving_throw_proficiencies: 'intelligence,wisdom',
        cantrips: 'fire-bolt,mage-hand,prestidigitation',
        known_spells: 'magic-missile,shield,detect-magic',
        prepared_spells: 'magic-missile,shield',
        total_level: 1
      };

      const statsData = {
        strength: 8,
        dexterity: 14,
        constitution: 12,
        intelligence: 16,
        wisdom: 13,
        charisma: 10,
        armor_class: 12,
        current_hit_points: 7,
        max_hit_points: 7
      };

      const equipmentData = [
        {
          item_name: 'Spellbook',
          item_type: 'equipment',
          quantity: 1,
          equipped: false,
          is_magic: false,
          magic_bonus: 0
        },
        {
          item_name: 'Component Pouch',
          item_type: 'equipment',
          quantity: 1,
          equipped: true,
          is_magic: false,
          magic_bonus: 0
        }
      ];

      const { data: characterId, error } = await supabase
        .rpc('create_character_atomic', {
          character_data: characterData,
          stats_data: statsData,
          equipment_data: equipmentData
        });

      expect(error).toBeNull();
      expect(characterId).toBeDefined();
      expect(typeof characterId).toBe('string');

      // Track for cleanup
      createdCharacterIds.push(characterId);

      // Verify character was created
      const { data: character } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      expect(character).toBeDefined();
      expect(character.name).toBe('Test Wizard');
      expect(character.race).toBe('Human');
      expect(character.class).toBe('Wizard');

      // Verify stats were created
      const { data: stats } = await supabase
        .from('character_stats')
        .select('*')
        .eq('character_id', characterId)
        .single();

      expect(stats).toBeDefined();
      expect(stats.intelligence).toBe(16);
      expect(stats.armor_class).toBe(12);

      // Verify equipment was created
      const { data: equipment } = await supabase
        .from('character_equipment')
        .select('*')
        .eq('character_id', characterId);

      expect(equipment).toBeDefined();
      expect(equipment.length).toBe(2);
      expect(equipment.some(e => e.item_name === 'Spellbook')).toBe(true);
      expect(equipment.some(e => e.item_name === 'Component Pouch')).toBe(true);
    });

    it('should create character without equipment', async () => {
      const characterData = {
        user_id: testUserId,
        campaign_id: testCampaignId,
        name: 'Test Fighter',
        race: 'Dwarf',
        class: 'Fighter',
        level: 1,
        alignment: 'Lawful Good',
        experience_points: 0,
        total_level: 1
      };

      const statsData = {
        strength: 16,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 11,
        charisma: 8,
        armor_class: 16,
        current_hit_points: 12,
        max_hit_points: 12
      };

      const { data: characterId, error } = await supabase
        .rpc('create_character_atomic', {
          character_data: characterData,
          stats_data: statsData,
          equipment_data: null
        });

      expect(error).toBeNull();
      expect(characterId).toBeDefined();

      // Track for cleanup
      createdCharacterIds.push(characterId);

      // Verify character was created
      const { data: character } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      expect(character).toBeDefined();
      expect(character.name).toBe('Test Fighter');

      // Verify stats were created
      const { data: stats } = await supabase
        .from('character_stats')
        .select('*')
        .eq('character_id', characterId)
        .single();

      expect(stats).toBeDefined();
      expect(stats.strength).toBe(16);

      // Verify no equipment was created
      const { data: equipment } = await supabase
        .from('character_equipment')
        .select('*')
        .eq('character_id', characterId);

      expect(equipment).toBeDefined();
      expect(equipment.length).toBe(0);
    });
  });

  describe('Rollback on Failure', () => {
    it('should rollback all changes if character creation fails', async () => {
      // Missing required field (name) to trigger failure
      const characterData = {
        user_id: testUserId,
        campaign_id: testCampaignId,
        // name is missing - this should cause failure
        race: 'Elf',
        class: 'Rogue',
        level: 1
      };

      const statsData = {
        strength: 10,
        dexterity: 16,
        constitution: 12,
        intelligence: 12,
        wisdom: 11,
        charisma: 14,
        armor_class: 13,
        current_hit_points: 9,
        max_hit_points: 9
      };

      const { data, error } = await supabase
        .rpc('create_character_atomic', {
          character_data: characterData,
          stats_data: statsData,
          equipment_data: null
        });

      // Should fail
      expect(error).toBeDefined();
      expect(data).toBeNull();

      // Verify no character was created
      const { data: characters } = await supabase
        .from('characters')
        .select('*')
        .eq('campaign_id', testCampaignId)
        .eq('race', 'Elf');

      expect(characters).toBeDefined();
      expect(characters.length).toBe(0);

      // Verify no stats were created
      const { data: allStats } = await supabase
        .from('character_stats')
        .select('*, characters!inner(campaign_id)')
        .eq('characters.campaign_id', testCampaignId);

      expect(allStats).toBeDefined();
      expect(allStats.length).toBe(0);
    });

    it('should rollback all changes if stats creation fails', async () => {
      const characterData = {
        user_id: testUserId,
        campaign_id: testCampaignId,
        name: 'Test Rollback Character',
        race: 'Halfling',
        class: 'Bard',
        level: 1,
        total_level: 1
      };

      // Invalid stats data (missing required fields)
      const invalidStatsData = {
        strength: 10
        // Missing other required ability scores
      };

      const { data, error } = await supabase
        .rpc('create_character_atomic', {
          character_data: characterData,
          stats_data: invalidStatsData,
          equipment_data: null
        });

      // Should fail
      expect(error).toBeDefined();
      expect(data).toBeNull();

      // Verify no character was created
      const { data: characters } = await supabase
        .from('characters')
        .select('*')
        .eq('campaign_id', testCampaignId)
        .eq('name', 'Test Rollback Character');

      expect(characters).toBeDefined();
      expect(characters.length).toBe(0);
    });

    it('should rollback all changes if equipment creation fails', async () => {
      const characterData = {
        user_id: testUserId,
        campaign_id: testCampaignId,
        name: 'Test Equipment Rollback',
        race: 'Gnome',
        class: 'Artificer',
        level: 1,
        total_level: 1
      };

      const statsData = {
        strength: 8,
        dexterity: 14,
        constitution: 13,
        intelligence: 16,
        wisdom: 12,
        charisma: 10,
        armor_class: 12,
        current_hit_points: 8,
        max_hit_points: 8
      };

      // Invalid equipment data (missing required item_name)
      const invalidEquipmentData = [
        {
          // item_name is missing
          quantity: 1,
          equipped: false
        }
      ];

      const { data, error } = await supabase
        .rpc('create_character_atomic', {
          character_data: characterData,
          stats_data: statsData,
          equipment_data: invalidEquipmentData
        });

      // Should fail
      expect(error).toBeDefined();
      expect(data).toBeNull();

      // Verify no character was created
      const { data: characters } = await supabase
        .from('characters')
        .select('*')
        .eq('campaign_id', testCampaignId)
        .eq('name', 'Test Equipment Rollback');

      expect(characters).toBeDefined();
      expect(characters.length).toBe(0);

      // Verify no stats were created
      const { data: allStats } = await supabase
        .from('character_stats')
        .select('*, characters!inner(campaign_id)')
        .eq('characters.campaign_id', testCampaignId);

      expect(allStats).toBeDefined();
      expect(allStats.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty equipment array', async () => {
      const characterData = {
        user_id: testUserId,
        campaign_id: testCampaignId,
        name: 'Test Empty Equipment',
        race: 'Tiefling',
        class: 'Warlock',
        level: 1,
        total_level: 1
      };

      const statsData = {
        strength: 8,
        dexterity: 13,
        constitution: 12,
        intelligence: 12,
        wisdom: 10,
        charisma: 16,
        armor_class: 11,
        current_hit_points: 9,
        max_hit_points: 9
      };

      const { data: characterId, error } = await supabase
        .rpc('create_character_atomic', {
          character_data: characterData,
          stats_data: statsData,
          equipment_data: []
        });

      expect(error).toBeNull();
      expect(characterId).toBeDefined();

      // Track for cleanup
      createdCharacterIds.push(characterId);

      // Verify character was created
      const { data: character } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      expect(character).toBeDefined();
      expect(character.name).toBe('Test Empty Equipment');
    });

    it('should handle default values correctly', async () => {
      const characterData = {
        user_id: testUserId,
        campaign_id: testCampaignId,
        name: 'Test Defaults',
        race: 'Dragonborn',
        class: 'Paladin',
        // level not provided - should default to 1
        // experience_points not provided - should default to 0
        total_level: 1
      };

      const statsData = {
        strength: 16,
        dexterity: 10,
        constitution: 14,
        intelligence: 8,
        wisdom: 12,
        charisma: 14,
        // armor_class not provided
        // hit points not provided
      };

      const { data: characterId, error } = await supabase
        .rpc('create_character_atomic', {
          character_data: characterData,
          stats_data: statsData,
          equipment_data: null
        });

      expect(error).toBeNull();
      expect(characterId).toBeDefined();

      // Track for cleanup
      createdCharacterIds.push(characterId);

      // Verify defaults were applied
      const { data: character } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      expect(character.level).toBe(1);
      expect(character.experience_points).toBe(0);

      const { data: stats } = await supabase
        .from('character_stats')
        .select('*')
        .eq('character_id', characterId)
        .single();

      expect(stats.armor_class).toBe(10); // Default AC
      expect(stats.max_hit_points).toBe(8); // Default HP
    });
  });
});
