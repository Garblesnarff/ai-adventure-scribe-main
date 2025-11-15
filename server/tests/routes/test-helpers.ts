/**
 * Test Helpers for API Integration Tests
 *
 * Provides utilities for authentication, test data generation,
 * and common test operations.
 */

import jwt from 'jsonwebtoken';
import { supabaseService } from '../../src/lib/supabase.js';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Generate a test JWT token for a given user ID
 */
export function generateTestToken(userId: string, email?: string): string {
  const payload = {
    sub: userId,
    email: email || `test-${userId}@example.com`,
    aud: 'authenticated',
    role: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Generate unique test user ID
 */
export function generateTestUserId(): string {
  return `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Clean up test data for a user
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  try {
    // Delete in order to respect foreign key constraints
    await supabaseService.from('game_sessions').delete().eq('campaign_id', userId);
    await supabaseService.from('character_spells').delete().match({ character_id: userId });
    await supabaseService.from('characters').delete().eq('user_id', userId);
    await supabaseService.from('campaigns').delete().eq('user_id', userId);
  } catch (error) {
    console.error('Error cleaning up test user:', error);
  }
}

/**
 * Create a test campaign
 */
export async function createTestCampaign(userId: string, overrides: any = {}) {
  const { data, error } = await supabaseService
    .from('campaigns')
    .insert({
      user_id: userId,
      name: overrides.name || 'Test Campaign',
      description: overrides.description || 'A test campaign',
      genre: overrides.genre || 'Fantasy',
      difficulty_level: overrides.difficulty_level || 'Medium',
      status: overrides.status || 'active',
      ...overrides,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test character
 */
export async function createTestCharacter(userId: string, overrides: any = {}) {
  const { data, error } = await supabaseService
    .from('characters')
    .insert({
      user_id: userId,
      name: overrides.name || 'Test Character',
      race: overrides.race || 'Human',
      class: overrides.class || 'Fighter',
      level: overrides.level || 1,
      campaign_id: overrides.campaign_id || null,
      ...overrides,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test game session
 */
export async function createTestSession(campaignId: string, characterId: string, overrides: any = {}) {
  const { data, error } = await supabaseService
    .from('game_sessions')
    .insert({
      campaign_id: campaignId,
      character_id: characterId,
      session_number: overrides.session_number || 1,
      status: overrides.status || 'active',
      start_time: overrides.start_time || new Date().toISOString(),
      ...overrides,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Assert response matches expected structure
 */
export function assertCampaignStructure(campaign: any): void {
  expect(campaign).toHaveProperty('id');
  expect(campaign).toHaveProperty('name');
  expect(campaign).toHaveProperty('user_id');
  expect(campaign).toHaveProperty('created_at');
  expect(campaign).toHaveProperty('updated_at');
}

export function assertCharacterStructure(character: any): void {
  expect(character).toHaveProperty('id');
  expect(character).toHaveProperty('name');
  expect(character).toHaveProperty('race');
  expect(character).toHaveProperty('class');
  expect(character).toHaveProperty('level');
  expect(character).toHaveProperty('user_id');
  expect(character).toHaveProperty('created_at');
}

export function assertSessionStructure(session: any): void {
  expect(session).toHaveProperty('id');
  expect(session).toHaveProperty('status');
  expect(session).toHaveProperty('created_at');
}
