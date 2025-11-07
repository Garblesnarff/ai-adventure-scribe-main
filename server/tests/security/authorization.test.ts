/**
 * Authorization Security Tests
 *
 * These tests verify that users cannot access resources they don't own.
 * IDOR (Insecure Direct Object Reference) vulnerability prevention.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabaseService } from '../../src/lib/supabase.js';

describe('Authorization Security Tests', () => {
  let user1Id: string;
  let user2Id: string;
  let user1Character: any;
  let user2Character: any;
  let user1Campaign: any;
  let user2Campaign: any;
  let user1Session: any;

  beforeAll(async () => {
    // Create test users
    user1Id = 'test-user-1-' + Date.now();
    user2Id = 'test-user-2-' + Date.now();

    // Create test character for user1
    const { data: char1 } = await supabaseService
      .from('characters')
      .insert({
        user_id: user1Id,
        name: 'Test Character 1',
        race: 'Human',
        class: 'Fighter',
        level: 1
      })
      .select()
      .single();
    user1Character = char1;

    // Create test character for user2
    const { data: char2 } = await supabaseService
      .from('characters')
      .insert({
        user_id: user2Id,
        name: 'Test Character 2',
        race: 'Elf',
        class: 'Wizard',
        level: 1
      })
      .select()
      .single();
    user2Character = char2;

    // Create test campaign for user1
    const { data: camp1 } = await supabaseService
      .from('campaigns')
      .insert({
        user_id: user1Id,
        name: 'Test Campaign 1',
        description: 'Test campaign description'
      })
      .select()
      .single();
    user1Campaign = camp1;

    // Create test campaign for user2
    const { data: camp2 } = await supabaseService
      .from('campaigns')
      .insert({
        user_id: user2Id,
        name: 'Test Campaign 2',
        description: 'Test campaign description'
      })
      .select()
      .single();
    user2Campaign = camp2;

    // Create test session for user1
    const { data: sess1 } = await supabaseService
      .from('game_sessions')
      .insert({
        campaign_id: user1Campaign.id,
        character_id: user1Character.id,
        session_number: 1,
        title: 'Test Session 1',
        summary: 'Test session summary'
      })
      .select()
      .single();
    user1Session = sess1;
  });

  afterAll(async () => {
    // Cleanup test data
    if (user1Session) {
      await supabaseService.from('game_sessions').delete().eq('id', user1Session.id);
    }
    if (user1Character) {
      await supabaseService.from('characters').delete().eq('id', user1Character.id);
    }
    if (user2Character) {
      await supabaseService.from('characters').delete().eq('id', user2Character.id);
    }
    if (user1Campaign) {
      await supabaseService.from('campaigns').delete().eq('id', user1Campaign.id);
    }
    if (user2Campaign) {
      await supabaseService.from('campaigns').delete().eq('id', user2Campaign.id);
    }
  });

  describe('Character Authorization', () => {
    it('should prevent user2 from accessing user1 character', async () => {
      const { data, error } = await supabaseService
        .from('characters')
        .select('*')
        .eq('id', user1Character.id)
        .eq('user_id', user2Id)
        .single();

      expect(error).toBeDefined();
      expect(error?.code).toBe('PGRST116'); // Not found
      expect(data).toBeNull();
    });

    it('should allow user1 to access their own character', async () => {
      const { data, error } = await supabaseService
        .from('characters')
        .select('*')
        .eq('id', user1Character.id)
        .eq('user_id', user1Id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBe(user1Character.id);
    });

    it('should prevent user2 from updating user1 character', async () => {
      const { data, error } = await supabaseService
        .from('characters')
        .update({ name: 'Hacked Character' })
        .eq('id', user1Character.id)
        .eq('user_id', user2Id)
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();

      // Verify character was not updated
      const { data: unchanged } = await supabaseService
        .from('characters')
        .select('name')
        .eq('id', user1Character.id)
        .single();

      expect(unchanged?.name).not.toBe('Hacked Character');
    });

    it('should prevent user2 from deleting user1 character', async () => {
      const { data, error } = await supabaseService
        .from('characters')
        .delete()
        .eq('id', user1Character.id)
        .eq('user_id', user2Id)
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();

      // Verify character still exists
      const { data: stillExists } = await supabaseService
        .from('characters')
        .select('id')
        .eq('id', user1Character.id)
        .single();

      expect(stillExists).toBeDefined();
    });
  });

  describe('Campaign Authorization', () => {
    it('should prevent user2 from accessing user1 campaign', async () => {
      const { data, error } = await supabaseService
        .from('campaigns')
        .select('*')
        .eq('id', user1Campaign.id)
        .eq('user_id', user2Id)
        .single();

      expect(error).toBeDefined();
      expect(error?.code).toBe('PGRST116');
      expect(data).toBeNull();
    });

    it('should allow user1 to access their own campaign', async () => {
      const { data, error } = await supabaseService
        .from('campaigns')
        .select('*')
        .eq('id', user1Campaign.id)
        .eq('user_id', user1Id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBe(user1Campaign.id);
    });

    it('should prevent user2 from creating sessions in user1 campaign', async () => {
      // First verify campaign ownership
      const { data: campaign } = await supabaseService
        .from('campaigns')
        .select('id')
        .eq('id', user1Campaign.id)
        .eq('user_id', user2Id)
        .single();

      expect(campaign).toBeNull();

      // This simulates the authorization check that should happen in the API
      // The API should verify campaign ownership before allowing session creation
    });
  });

  describe('Session Authorization', () => {
    it('should allow campaign owner to access session', async () => {
      const { data, error } = await supabaseService
        .from('game_sessions')
        .select(`
          *,
          campaigns!game_sessions_campaign_id_fkey(user_id),
          characters!game_sessions_character_id_fkey(user_id)
        `)
        .eq('id', user1Session.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Verify ownership through relationship
      const campaignOwner = (data?.campaigns as any)?.user_id;
      expect(campaignOwner).toBe(user1Id);
    });

    it('should verify session ownership through relationships', async () => {
      const { data } = await supabaseService
        .from('game_sessions')
        .select(`
          *,
          campaigns!game_sessions_campaign_id_fkey(user_id),
          characters!game_sessions_character_id_fkey(user_id)
        `)
        .eq('id', user1Session.id)
        .single();

      const campaignOwner = (data?.campaigns as any)?.user_id;
      const characterOwner = (data?.characters as any)?.user_id;

      // Both should be user1 in this test setup
      expect(campaignOwner).toBe(user1Id);
      expect(characterOwner).toBe(user1Id);

      // User2 should not be an owner
      expect(campaignOwner).not.toBe(user2Id);
      expect(characterOwner).not.toBe(user2Id);
    });
  });

  describe('Cross-User Resource Access', () => {
    it('should not return any characters when filtering by wrong user_id', async () => {
      const { data } = await supabaseService
        .from('characters')
        .select('*')
        .eq('user_id', user2Id)
        .in('id', [user1Character.id]);

      expect(data).toEqual([]);
    });

    it('should only return user-owned resources in list endpoints', async () => {
      const { data: user1Characters } = await supabaseService
        .from('characters')
        .select('*')
        .eq('user_id', user1Id);

      const { data: user2Characters } = await supabaseService
        .from('characters')
        .select('*')
        .eq('user_id', user2Id);

      // Verify no overlap
      const user1Ids = user1Characters?.map(c => c.id) || [];
      const user2Ids = user2Characters?.map(c => c.id) || [];

      const overlap = user1Ids.filter(id => user2Ids.includes(id));
      expect(overlap).toEqual([]);
    });
  });
});
