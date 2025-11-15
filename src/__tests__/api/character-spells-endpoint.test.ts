import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Pool } from 'pg';

/**
 * Character Spells API Endpoint Tests
 *
 * Tests for the `/characters/:id/spells` endpoint that validates and saves character spells.
 * Ensures that the API properly enforces spell restrictions and prevents invalid selections.
 *
 * Critical for preventing the bug where wizards could select divine spells.
 */

// Mock dependencies
vi.mock('../../middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123' };
    next();
  },
}));

// Mock Supabase service
const mockSupabaseService = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    insert: vi.fn(),
  })),
};

vi.mock('../../lib/supabase.js', () => ({
  supabaseService: mockSupabaseService,
}));

// Import the character router after mocking
let characterRouter: any;

describe('Character Spells API Endpoint', () => {
  let app: express.Application;
  let mockDb: Partial<Pool>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock database
    mockDb = {
      connect: vi.fn(() =>
        Promise.resolve({
          query: vi.fn(),
          release: vi.fn(),
        }),
      ),
    };

    // Import and setup the router
    const { default: createCharacterRouter } = await import('@/server/src/routes/v1/characters');
    characterRouter = createCharacterRouter(mockDb as Pool);

    // Create express app
    app = express();
    app.use(express.json());
    app.use('/characters', characterRouter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /characters/:id/spells - Spell Validation', () => {
    it('should reject wizard selecting cleric spells', async () => {
      // Mock character lookup
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'char-123', class: 'Wizard' },
          error: null,
        });

      // Mock class lookup
      mockSupabaseService
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'class-wizard' },
          error: null,
        });

      // Mock spell validation - reject divine spells
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // cure-wounds not in wizard list
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // healing-word not in wizard list

      // Mock spell name lookup for error messages
      mockSupabaseService
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({ data: { name: 'Cure Wounds' }, error: null })
        .mockResolvedValueOnce({ data: { name: 'Healing Word' }, error: null });

      const response = await request(app)
        .post('/characters/char-123/spells')
        .send({
          spells: ['cure-wounds', 'healing-word'],
          className: 'Wizard',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid spell selection',
        details: ['Wizard cannot learn Cure Wounds', 'Wizard cannot learn Healing Word'],
      });
    });

    it('should reject cleric selecting wizard spells', async () => {
      // Mock character lookup
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'char-456', class: 'Cleric' },
          error: null,
        });

      // Mock class lookup
      mockSupabaseService
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'class-cleric' },
          error: null,
        });

      // Mock spell validation - reject arcane spells
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // magic-missile not in cleric list
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // fireball not in cleric list

      // Mock spell name lookup for error messages
      mockSupabaseService
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({ data: { name: 'Magic Missile' }, error: null })
        .mockResolvedValueOnce({ data: { name: 'Fireball' }, error: null });

      const response = await request(app)
        .post('/characters/char-456/spells')
        .send({
          spells: ['magic-missile', 'fireball'],
          className: 'Cleric',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid spell selection',
        details: ['Cleric cannot learn Magic Missile', 'Cleric cannot learn Fireball'],
      });
    });

    it('should accept valid wizard spell selection', async () => {
      // Mock character lookup
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'char-123', class: 'Wizard' },
          error: null,
        });

      // Mock class lookup
      mockSupabaseService
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'class-wizard' },
          error: null,
        });

      // Mock spell validation - accept wizard spells
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({ data: { id: 'spell-relation-1' }, error: null }) // magic-missile valid
        .mockResolvedValueOnce({ data: { id: 'spell-relation-2' }, error: null }); // shield valid

      // Mock delete existing spells
      mockSupabaseService.from().delete().eq().eq.mockResolvedValueOnce({ error: null });

      // Mock insert new spells
      mockSupabaseService.from().insert.mockResolvedValueOnce({ error: null });

      const response = await request(app)
        .post('/characters/char-123/spells')
        .send({
          spells: ['magic-missile', 'shield'],
          className: 'Wizard',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Character spells saved successfully',
      });
    });

    it('should accept valid cleric spell selection', async () => {
      // Mock character lookup
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'char-456', class: 'Cleric' },
          error: null,
        });

      // Mock class lookup
      mockSupabaseService
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'class-cleric' },
          error: null,
        });

      // Mock spell validation - accept cleric spells
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({ data: { id: 'spell-relation-3' }, error: null }) // cure-wounds valid
        .mockResolvedValueOnce({ data: { id: 'spell-relation-4' }, error: null }); // bless valid

      // Mock delete existing spells
      mockSupabaseService.from().delete().eq().eq.mockResolvedValueOnce({ error: null });

      // Mock insert new spells
      mockSupabaseService.from().insert.mockResolvedValueOnce({ error: null });

      const response = await request(app)
        .post('/characters/char-456/spells')
        .send({
          spells: ['cure-wounds', 'bless'],
          className: 'Cleric',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Character spells saved successfully',
      });
    });

    it('should handle mixed valid and invalid spell selections', async () => {
      // Mock character lookup
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'char-123', class: 'Wizard' },
          error: null,
        });

      // Mock class lookup
      mockSupabaseService
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'class-wizard' },
          error: null,
        });

      // Mock spell validation - mixed results
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({ data: { id: 'spell-relation-1' }, error: null }) // magic-missile valid
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // cure-wounds invalid
        .mockResolvedValueOnce({ data: { id: 'spell-relation-2' }, error: null }); // shield valid

      // Mock spell name lookup for error message
      mockSupabaseService
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { name: 'Cure Wounds' },
          error: null,
        });

      const response = await request(app)
        .post('/characters/char-123/spells')
        .send({
          spells: ['magic-missile', 'cure-wounds', 'shield'],
          className: 'Wizard',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid spell selection',
        details: ['Wizard cannot learn Cure Wounds'],
      });
    });

    it('should reject requests with missing required fields', async () => {
      const testCases = [
        { body: {}, expectedError: 'Missing required fields: spells and className' },
        {
          body: { spells: ['magic-missile'] },
          expectedError: 'Missing required fields: spells and className',
        },
        {
          body: { className: 'Wizard' },
          expectedError: 'Missing required fields: spells and className',
        },
        {
          body: { spells: null, className: 'Wizard' },
          expectedError: 'Missing required fields: spells and className',
        },
        {
          body: { spells: ['magic-missile'], className: null },
          expectedError: 'Missing required fields: spells and className',
        },
      ];

      for (const testCase of testCases) {
        const response = await request(app).post('/characters/char-123/spells').send(testCase.body);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(testCase.expectedError);
      }
    });

    it('should handle character not found', async () => {
      // Mock character lookup - not found
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        });

      const response = await request(app)
        .post('/characters/nonexistent/spells')
        .send({
          spells: ['magic-missile'],
          className: 'Wizard',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Character not found');
    });

    it('should handle invalid class name', async () => {
      // Mock character lookup
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'char-123', class: 'Wizard' },
          error: null,
        });

      // Mock class lookup - not found
      mockSupabaseService
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        });

      const response = await request(app)
        .post('/characters/char-123/spells')
        .send({
          spells: ['magic-missile'],
          className: 'InvalidClass',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid class name');
    });

    it('should handle database errors gracefully', async () => {
      // Mock character lookup with database error
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: null,
          error: new Error('Database connection failed'),
        });

      const response = await request(app)
        .post('/characters/char-123/spells')
        .send({
          spells: ['magic-missile'],
          className: 'Wizard',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to validate character spells');
    });

    it('should properly clear and insert spells', async () => {
      // Mock successful validation flow
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'char-123', class: 'Wizard' },
          error: null,
        });

      mockSupabaseService
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'class-wizard' },
          error: null,
        });

      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({ data: { id: 'spell-relation-1' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'spell-relation-2' }, error: null });

      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      mockSupabaseService.from().delete().eq.mockReturnValue({ eq: mockDelete });
      mockSupabaseService.from().insert = mockInsert;

      await request(app)
        .post('/characters/char-123/spells')
        .send({
          spells: ['magic-missile', 'shield'],
          className: 'Wizard',
        });

      // Verify delete was called to clear existing spells
      expect(mockDelete).toHaveBeenCalledWith('class-wizard');

      // Verify insert was called with correct spell data
      expect(mockInsert).toHaveBeenCalledWith([
        {
          character_id: 'char-123',
          spell_id: 'magic-missile',
          source_class_id: 'class-wizard',
          is_prepared: true,
          source_feature: 'base',
        },
        {
          character_id: 'char-123',
          spell_id: 'shield',
          source_class_id: 'class-wizard',
          is_prepared: true,
          source_feature: 'base',
        },
      ]);
    });

    it('should handle empty spell array', async () => {
      // Mock successful validation flow
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'char-123', class: 'Wizard' },
          error: null,
        });

      mockSupabaseService
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'class-wizard' },
          error: null,
        });

      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseService.from().delete().eq.mockReturnValue({ eq: mockDelete });

      const response = await request(app).post('/characters/char-123/spells').send({
        spells: [],
        className: 'Wizard',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Character spells saved successfully',
      });

      // Should still delete existing spells but not insert any new ones
      expect(mockDelete).toHaveBeenCalled();
      expect(mockSupabaseService.from().insert).not.toHaveBeenCalled();
    });

    it('should prevent SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE spells; --",
        "1; DELETE FROM characters WHERE id = '1'; --",
        "' OR '1'='1",
        "'; UPDATE characters SET class = 'Admin'; --",
      ];

      for (const maliciousInput of maliciousInputs) {
        // Mock character lookup to fail for malicious input
        mockSupabaseService
          .from()
          .select()
          .eq()
          .eq()
          .single.mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116' },
          });

        const response = await request(app)
          .post(`/characters/${maliciousInput}/spells`)
          .send({
            spells: ['magic-missile'],
            className: 'Wizard',
          });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Character not found');
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      // Override the auth mock to reject
      vi.mocked(require('../../middleware/auth.js').requireAuth).mockImplementationOnce(
        (req: any, res: any, next: any) => {
          res.status(401).json({ error: 'Unauthorized' });
        },
      );

      const response = await request(app)
        .post('/characters/char-123/spells')
        .send({
          spells: ['magic-missile'],
          className: 'Wizard',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should verify character ownership', async () => {
      // Mock character lookup with different user
      mockSupabaseService
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: null, // Character not found for this user
          error: { code: 'PGRST116' },
        });

      const response = await request(app)
        .post('/characters/char-123/spells')
        .send({
          spells: ['magic-missile'],
          className: 'Wizard',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Character not found');
    });
  });
});
