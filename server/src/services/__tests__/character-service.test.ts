/**
 * Character Service Tests
 *
 * Comprehensive test suite for CharacterService with authorization,
 * CRUD operations, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CharacterService } from '../character-service';
import type { Character, NewCharacter } from '../../../../db/schema';

// Mock the schema tables
vi.mock('../../../../db/schema', () => {
  const mockCharacters = {
    id: 'id',
    userId: 'userId',
    name: 'name',
    race: 'race',
    class: 'class',
    level: 'level',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  };

  return {
    characters: mockCharacters,
    characterStats: {},
    campaigns: {},
  };
});

// Mock the database client
vi.mock('../../../../db/client', () => {
  const mockQuery = {
    characters: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  };

  const mockDb = {
    query: mockQuery,
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  };

  return {
    db: mockDb,
  };
});

describe('CharacterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listForUser', () => {
    it('should return all characters for a user ordered by creation date', async () => {
      const userId = 'user-123';
      const mockCharacters: Partial<Character>[] = [
        {
          id: 'char-1',
          userId,
          name: 'Gandalf',
          race: 'Human',
          class: 'Wizard',
          level: 10,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'char-2',
          userId,
          name: 'Aragorn',
          race: 'Human',
          class: 'Ranger',
          level: 8,
          createdAt: new Date('2024-01-01'),
        },
      ];

      const { db } = await import('../../../../db/client');
      vi.mocked(db.query.characters.findMany).mockResolvedValue(mockCharacters as Character[]);

      const result = await CharacterService.listForUser(userId);

      expect(result).toEqual(mockCharacters);
      expect(db.query.characters.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          orderBy: expect.any(Array),
        })
      );
    });

    it('should return empty array when user has no characters', async () => {
      const { db } = await import('../../../../db/client');
      vi.mocked(db.query.characters.findMany).mockResolvedValue([]);

      const result = await CharacterService.listForUser('user-no-chars');

      expect(result).toEqual([]);
    });

    it('should only include specific columns in response', async () => {
      const { db } = await import('../../../../db/client');
      vi.mocked(db.query.characters.findMany).mockResolvedValue([]);

      await CharacterService.listForUser('user-123');

      expect(db.query.characters.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: expect.objectContaining({
            id: true,
            name: true,
            race: true,
            class: true,
            level: true,
          }),
        })
      );
    });
  });

  describe('getById', () => {
    it('should return character with stats when authorized', async () => {
      const userId = 'user-123';
      const characterId = 'char-123';
      const mockCharacter: Partial<Character> = {
        id: characterId,
        userId,
        name: 'Legolas',
        race: 'Elf',
        class: 'Ranger',
        level: 9,
      };

      const { db } = await import('../../../../db/client');
      vi.mocked(db.query.characters.findFirst).mockResolvedValue(mockCharacter as Character);

      const result = await CharacterService.getById(characterId, userId);

      expect(result).toEqual(mockCharacter);
      expect(db.query.characters.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          with: { stats: true },
        })
      );
    });

    it('should return null when character not found', async () => {
      const { db } = await import('../../../../db/client');
      vi.mocked(db.query.characters.findFirst).mockResolvedValue(undefined);

      const result = await CharacterService.getById('nonexistent', 'user-123');

      expect(result).toBeNull();
    });

    it('should return null when user does not own character (authorization check)', async () => {
      const { db } = await import('../../../../db/client');
      vi.mocked(db.query.characters.findFirst).mockResolvedValue(undefined);

      const result = await CharacterService.getById('char-123', 'wrong-user-id');

      expect(result).toBeNull();
    });

    it('should enforce both characterId and userId in query', async () => {
      const { db } = await import('../../../../db/client');
      vi.mocked(db.query.characters.findFirst).mockResolvedValue(undefined);

      await CharacterService.getById('char-123', 'user-123');

      // Verify the where clause includes both conditions
      expect(db.query.characters.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        })
      );
    });
  });

  describe('getWithCampaign', () => {
    it('should return character with campaign details', async () => {
      const userId = 'user-123';
      const characterId = 'char-123';
      const mockCharacter = {
        id: characterId,
        userId,
        name: 'Gimli',
        campaign: {
          id: 'campaign-1',
          title: 'Lost Mines of Phandelver',
          description: 'A classic adventure',
          imageUrl: 'https://example.com/image.jpg',
        },
        stats: {
          strength: 18,
          dexterity: 12,
          constitution: 16,
          intelligence: 10,
          wisdom: 12,
          charisma: 8,
        },
      };

      const { db } = await import('../../../../db/client');
      vi.mocked(db.query.characters.findFirst).mockResolvedValue(mockCharacter as any);

      const result = await CharacterService.getWithCampaign(characterId, userId);

      expect(result).toEqual(mockCharacter);
      expect(result?.campaign).toBeDefined();
      expect(result?.stats).toBeDefined();
    });

    it('should return null when character not found', async () => {
      const { db } = await import('../../../../db/client');
      vi.mocked(db.query.characters.findFirst).mockResolvedValue(undefined);

      const result = await CharacterService.getWithCampaign('nonexistent', 'user-123');

      expect(result).toBeNull();
    });

    it('should include specific campaign columns only', async () => {
      const { db } = await import('../../../../db/client');
      vi.mocked(db.query.characters.findFirst).mockResolvedValue(undefined);

      await CharacterService.getWithCampaign('char-123', 'user-123');

      expect(db.query.characters.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          with: expect.objectContaining({
            campaign: expect.objectContaining({
              columns: expect.objectContaining({
                id: true,
                title: true,
                description: true,
                imageUrl: true,
              }),
            }),
            stats: true,
          }),
        })
      );
    });
  });

  describe('create', () => {
    it('should create a new character with provided data', async () => {
      const userId = 'user-123';
      const characterData: Partial<NewCharacter> = {
        name: 'Frodo',
        race: 'Halfling',
        class: 'Rogue',
        level: 3,
        description: 'A brave hobbit',
        alignment: 'Neutral Good',
      };

      const createdCharacter: Partial<Character> = {
        id: 'char-new',
        userId,
        ...characterData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockResolvedValue([createdCharacter]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const result = await CharacterService.create(userId, characterData);

      expect(result).toEqual(createdCharacter);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should set default values for optional fields', async () => {
      const userId = 'user-123';
      const minimalData: Partial<NewCharacter> = {
        name: 'Sam',
      };

      const createdCharacter: Partial<Character> = {
        id: 'char-new',
        userId,
        name: 'Sam',
        level: 1,
        experiencePoints: 0,
      };

      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockResolvedValue([createdCharacter]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const result = await CharacterService.create(userId, minimalData);

      expect(result.name).toBe('Sam');
      expect(result.level).toBe(1);
    });

    it('should use "Unnamed Character" as default name', async () => {
      const userId = 'user-123';
      const emptyData: Partial<NewCharacter> = {};

      const createdCharacter: Partial<Character> = {
        id: 'char-new',
        userId,
        name: 'Unnamed Character',
        level: 1,
      };

      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockResolvedValue([createdCharacter]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const result = await CharacterService.create(userId, emptyData);

      expect(result.name).toBe('Unnamed Character');
    });
  });

  describe('update', () => {
    it('should update character when user owns it', async () => {
      const userId = 'user-123';
      const characterId = 'char-123';
      const updateData: Partial<NewCharacter> = {
        name: 'Gandalf the White',
        level: 20,
      };

      const updatedCharacter: Partial<Character> = {
        id: characterId,
        userId,
        name: 'Gandalf the White',
        level: 20,
        updatedAt: new Date(),
      };

      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockResolvedValue([updatedCharacter]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const result = await CharacterService.update(characterId, userId, updateData);

      expect(result).toEqual(updatedCharacter);
      expect(db.update).toHaveBeenCalled();
    });

    it('should return null when character not found or not owned', async () => {
      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const result = await CharacterService.update('char-123', 'wrong-user', { level: 10 });

      expect(result).toBeNull();
    });

    it('should automatically update updatedAt timestamp', async () => {
      const userId = 'user-123';
      const characterId = 'char-123';
      const updateData: Partial<NewCharacter> = { level: 5 };

      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockResolvedValue([{ id: characterId, userId, level: 5 }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await CharacterService.update(characterId, userId, updateData);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedAt: expect.any(Date),
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete character when user owns it', async () => {
      const userId = 'user-123';
      const characterId = 'char-123';

      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockResolvedValue([{ id: characterId }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockDelete = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.delete).mockReturnValue(mockDelete() as any);

      const result = await CharacterService.delete(characterId, userId);

      expect(result).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });

    it('should return false when character not found or not owned', async () => {
      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockDelete = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.delete).mockReturnValue(mockDelete() as any);

      const result = await CharacterService.delete('char-123', 'wrong-user');

      expect(result).toBe(false);
    });

    it('should enforce authorization with both characterId and userId', async () => {
      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockDelete = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.delete).mockReturnValue(mockDelete() as any);

      await CharacterService.delete('char-123', 'user-123');

      expect(mockWhere).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('updateSpells', () => {
    it('should update cantrips as comma-separated string', async () => {
      const userId = 'user-123';
      const characterId = 'char-123';
      const spellData = {
        cantrips: ['Fire Bolt', 'Mage Hand', 'Prestidigitation'],
      };

      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockResolvedValue([{ id: characterId }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await CharacterService.updateSpells(characterId, userId, spellData);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          cantrips: 'Fire Bolt,Mage Hand,Prestidigitation',
        })
      );
    });

    it('should update multiple spell types simultaneously', async () => {
      const userId = 'user-123';
      const characterId = 'char-123';
      const spellData = {
        knownSpells: ['Magic Missile', 'Shield'],
        preparedSpells: ['Magic Missile'],
        ritualSpells: ['Detect Magic'],
      };

      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockResolvedValue([{ id: characterId }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await CharacterService.updateSpells(characterId, userId, spellData);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          knownSpells: 'Magic Missile,Shield',
          preparedSpells: 'Magic Missile',
          ritualSpells: 'Detect Magic',
        })
      );
    });
  });

  describe('parseSpells', () => {
    it('should parse comma-separated spell string to array', () => {
      const spellString = 'Fire Bolt, Mage Hand, Prestidigitation';
      const result = CharacterService.parseSpells(spellString);

      expect(result).toEqual(['Fire Bolt', 'Mage Hand', 'Prestidigitation']);
    });

    it('should handle null spell string', () => {
      const result = CharacterService.parseSpells(null);

      expect(result).toEqual([]);
    });

    it('should handle empty spell string', () => {
      const result = CharacterService.parseSpells('');

      expect(result).toEqual([]);
    });

    it('should trim whitespace from spell names', () => {
      const spellString = '  Fire Bolt  ,  Mage Hand  ';
      const result = CharacterService.parseSpells(spellString);

      expect(result).toEqual(['Fire Bolt', 'Mage Hand']);
    });

    it('should filter out empty entries', () => {
      const spellString = 'Fire Bolt,,Mage Hand,,,';
      const result = CharacterService.parseSpells(spellString);

      expect(result).toEqual(['Fire Bolt', 'Mage Hand']);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in listForUser', async () => {
      const { db } = await import('../../../../db/client');
      vi.mocked(db.query.characters.findMany).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(CharacterService.listForUser('user-123')).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle database errors in create', async () => {
      const { db } = await import('../../../../db/client');
      const mockValues = vi.fn(() => ({ returning: vi.fn().mockRejectedValue(new Error('Insert failed')) }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      await expect(
        CharacterService.create('user-123', { name: 'Test' })
      ).rejects.toThrow('Insert failed');
    });

    it('should handle database errors in update', async () => {
      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockRejectedValue(new Error('Update failed'));
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await expect(
        CharacterService.update('char-123', 'user-123', { level: 10 })
      ).rejects.toThrow('Update failed');
    });

    it('should handle database errors in delete', async () => {
      const { db } = await import('../../../../db/client');
      const mockReturning = vi.fn().mockRejectedValue(new Error('Delete failed'));
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockDelete = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.delete).mockReturnValue(mockDelete() as any);

      await expect(
        CharacterService.delete('char-123', 'user-123')
      ).rejects.toThrow('Delete failed');
    });
  });
});
