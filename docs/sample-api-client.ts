/**
 * D&D 5E Mechanics API - Sample Client Implementation
 *
 * This is a complete, production-ready API client for the AI Adventure Scribe D&D 5E API.
 * Copy this to your frontend project and customize as needed.
 *
 * Features:
 * - Type-safe API calls
 * - Automatic retry logic with exponential backoff
 * - Rate limit handling
 * - Request caching
 * - Error handling
 * - Request throttling
 *
 * @version 2.0.0
 * @date 2025-11-14
 */

import type {
  ApiErrorResponse,
  ApiError,
  CombatState,
  AttackRequest,
  AttackResult,
  DamageRequest,
  DamageResult,
  ShortRestResult,
  LongRestResult,
  HitDice,
  InventoryItem,
  CreateItemRequest,
  EncumbranceStatus,
  ProgressionStatus,
  AwardXPRequest,
  AwardXPResult,
  LevelUpRequest,
  LevelUpResult,
  CharacterFeature,
  SpellSlot,
  UseSpellSlotRequest,
  UseSpellSlotResult,
} from './client-types';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableCaching?: boolean;
  cacheTimeout?: number;
  enableThrottling?: boolean;
  requestsPerMinute?: number;
}

const DEFAULT_CONFIG: Required<Omit<ApiClientConfig, 'baseUrl'>> = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableCaching: true,
  cacheTimeout: 300000, // 5 minutes
  enableThrottling: false,
  requestsPerMinute: 50,
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

class ApiClientError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ============================================================================
// CACHE
// ============================================================================

class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor(private ttl: number) {}

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// THROTTLER
// ============================================================================

class RequestThrottler {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private minDelay: number;

  constructor(requestsPerMinute: number) {
    this.minDelay = (60 * 1000) / requestsPerMinute;
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const fn = this.queue.shift()!;

    await fn();
    await this.sleep(this.minDelay);

    this.processQueue();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// API CLIENT
// ============================================================================

export class DndApiClient {
  private config: Required<ApiClientConfig>;
  private cache: ApiCache;
  private throttler: RequestThrottler | null = null;

  constructor(config: ApiClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new ApiCache(this.config.cacheTimeout);

    if (this.config.enableThrottling) {
      this.throttler = new RequestThrottler(this.config.requestsPerMinute);
    }
  }

  // ============================================================================
  // CORE REQUEST METHOD
  // ============================================================================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipCache = false
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const cacheKey = `${options.method || 'GET'}:${endpoint}`;

    // Check cache for GET requests
    if (!skipCache && options.method === 'GET' && this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    // Get auth token
    const token = this.getAuthToken();

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    // Create request function
    const makeRequest = async (): Promise<T> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        const data = await response.json();

        // Cache successful GET requests
        if (options.method === 'GET' && this.config.enableCaching) {
          this.cache.set(cacheKey, data);
        }

        return data;
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          throw new ApiClientError('TIMEOUT', 408, 'Request timeout');
        }

        throw error;
      }
    };

    // Apply throttling if enabled
    if (this.throttler && options.method !== 'GET') {
      return this.throttler.enqueue(makeRequest);
    }

    // Retry logic
    return this.withRetry(makeRequest);
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: ApiErrorResponse;

    try {
      errorData = await response.json();
    } catch {
      throw new ApiClientError(
        'UNKNOWN',
        response.status,
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    throw new ApiClientError(
      errorData.error.code,
      errorData.error.statusCode,
      errorData.error.message,
      errorData.error.details
    );
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry client errors (4xx except 429)
        if (
          error instanceof ApiClientError &&
          error.statusCode >= 400 &&
          error.statusCode < 500 &&
          error.statusCode !== 429
        ) {
          throw error;
        }

        // Handle rate limiting
        if (error instanceof ApiClientError && error.code === 'RATE_LIMIT_EXCEEDED') {
          const retryAfter = error.details?.retryAfter || 60;
          console.warn(`Rate limited. Retrying after ${retryAfter}s...`);
          await this.sleep(retryAfter * 1000);
          continue;
        }

        // Last attempt - throw error
        if (attempt === this.config.maxRetries - 1) {
          throw error;
        }

        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getAuthToken(): string | null {
    // Override this method to use your auth system
    return localStorage.getItem('authToken');
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  invalidateCache(pattern?: RegExp): void {
    if (pattern) {
      this.cache.invalidatePattern(pattern);
    } else {
      this.cache.clear();
    }
  }

  // ============================================================================
  // COMBAT API
  // ============================================================================

  async startCombat(
    sessionId: string,
    participants: any[]
  ): Promise<CombatState> {
    return this.request(`/v1/sessions/${sessionId}/combat/start`, {
      method: 'POST',
      body: JSON.stringify({ participants }),
    });
  }

  async getCombatState(encounterId: string): Promise<CombatState> {
    return this.request(`/v1/combat/${encounterId}/status`, {
      method: 'GET',
    });
  }

  async rollInitiative(
    encounterId: string,
    participantId: string,
    roll?: number
  ): Promise<any> {
    return this.request(`/v1/combat/${encounterId}/roll-initiative`, {
      method: 'POST',
      body: JSON.stringify({ participantId, roll }),
    });
  }

  async makeAttack(
    encounterId: string,
    attack: AttackRequest
  ): Promise<AttackResult> {
    const result = await this.request<AttackResult>(
      `/v1/combat/${encounterId}/attack`,
      {
        method: 'POST',
        body: JSON.stringify(attack),
      }
    );

    // Invalidate combat state cache after attack
    this.cache.invalidate(`GET:/v1/combat/${encounterId}/status`);

    return result;
  }

  async applyDamage(
    encounterId: string,
    damage: DamageRequest
  ): Promise<DamageResult> {
    const result = await this.request<DamageResult>(
      `/v1/combat/${encounterId}/damage`,
      {
        method: 'POST',
        body: JSON.stringify(damage),
      }
    );

    this.cache.invalidate(`GET:/v1/combat/${encounterId}/status`);
    return result;
  }

  async healParticipant(
    encounterId: string,
    participantId: string,
    healingAmount: number,
    sourceDescription?: string
  ): Promise<any> {
    const result = await this.request(`/v1/combat/${encounterId}/heal`, {
      method: 'POST',
      body: JSON.stringify({ participantId, healingAmount, sourceDescription }),
    });

    this.cache.invalidate(`GET:/v1/combat/${encounterId}/status`);
    return result;
  }

  async rollDeathSave(
    encounterId: string,
    participantId: string,
    roll: number
  ): Promise<any> {
    const result = await this.request(`/v1/combat/${encounterId}/death-save`, {
      method: 'POST',
      body: JSON.stringify({ participantId, roll }),
    });

    this.cache.invalidate(`GET:/v1/combat/${encounterId}/status`);
    return result;
  }

  async applyCondition(
    encounterId: string,
    condition: any
  ): Promise<any> {
    const result = await this.request(
      `/v1/combat/${encounterId}/conditions/apply`,
      {
        method: 'POST',
        body: JSON.stringify(condition),
      }
    );

    this.cache.invalidate(`GET:/v1/combat/${encounterId}/status`);
    return result;
  }

  async nextTurn(encounterId: string): Promise<any> {
    const result = await this.request(`/v1/combat/${encounterId}/next-turn`, {
      method: 'POST',
    });

    this.cache.invalidate(`GET:/v1/combat/${encounterId}/status`);
    return result;
  }

  // ============================================================================
  // REST API
  // ============================================================================

  async takeShortRest(
    characterId: string,
    hitDiceToSpend: number = 0,
    notes?: string
  ): Promise<ShortRestResult> {
    const result = await this.request<ShortRestResult>(
      `/v1/rest/characters/${characterId}/short`,
      {
        method: 'POST',
        body: JSON.stringify({ hitDiceToSpend, notes }),
      }
    );

    this.invalidateCache(/\/v1\/characters\/${characterId}/);
    return result;
  }

  async takeLongRest(
    characterId: string,
    notes?: string
  ): Promise<LongRestResult> {
    const result = await this.request<LongRestResult>(
      `/v1/rest/characters/${characterId}/long`,
      {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }
    );

    this.invalidateCache(/\/v1\/characters\/${characterId}/);
    return result;
  }

  async getHitDice(characterId: string): Promise<HitDice[]> {
    const response = await this.request<{ hitDice: HitDice[] }>(
      `/v1/rest/characters/${characterId}/hit-dice`
    );
    return response.hitDice;
  }

  async spendHitDice(characterId: string, count: number): Promise<any> {
    const result = await this.request(
      `/v1/rest/characters/${characterId}/hit-dice/spend`,
      {
        method: 'POST',
        body: JSON.stringify({ count }),
      }
    );

    this.cache.invalidate(`GET:/v1/rest/characters/${characterId}/hit-dice`);
    return result;
  }

  // ============================================================================
  // INVENTORY API
  // ============================================================================

  async getInventory(
    characterId: string,
    filters?: { itemType?: string; equipped?: boolean }
  ): Promise<InventoryItem[]> {
    const params = new URLSearchParams();
    if (filters?.itemType) params.append('itemType', filters.itemType);
    if (filters?.equipped !== undefined)
      params.append('equipped', String(filters.equipped));

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<{ items: InventoryItem[] }>(
      `/v1/characters/${characterId}/inventory${query}`
    );

    return response.items;
  }

  async addItem(
    characterId: string,
    item: CreateItemRequest
  ): Promise<InventoryItem> {
    const response = await this.request<{ item: InventoryItem }>(
      `/v1/characters/${characterId}/inventory`,
      {
        method: 'POST',
        body: JSON.stringify(item),
      }
    );

    this.cache.invalidate(`GET:/v1/characters/${characterId}/inventory`);
    return response.item;
  }

  async useConsumable(
    characterId: string,
    itemId: string,
    quantity: number = 1
  ): Promise<any> {
    const result = await this.request(
      `/v1/characters/${characterId}/inventory/${itemId}/use`,
      {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      }
    );

    this.cache.invalidate(`GET:/v1/characters/${characterId}/inventory`);
    return result;
  }

  async equipItem(characterId: string, itemId: string): Promise<void> {
    await this.request(
      `/v1/characters/${characterId}/inventory/${itemId}/equip`,
      { method: 'POST' }
    );

    this.cache.invalidate(`GET:/v1/characters/${characterId}/inventory`);
  }

  async unequipItem(characterId: string, itemId: string): Promise<void> {
    await this.request(
      `/v1/characters/${characterId}/inventory/${itemId}/unequip`,
      { method: 'POST' }
    );

    this.cache.invalidate(`GET:/v1/characters/${characterId}/inventory`);
  }

  async checkEncumbrance(characterId: string): Promise<EncumbranceStatus> {
    return this.request(`/v1/characters/${characterId}/encumbrance`);
  }

  // ============================================================================
  // PROGRESSION API
  // ============================================================================

  async getProgression(characterId: string): Promise<ProgressionStatus> {
    return this.request(`/v1/progression/characters/${characterId}/progression`);
  }

  async awardXP(
    characterId: string,
    xp: number,
    source: string,
    description?: string
  ): Promise<AwardXPResult> {
    const result = await this.request<AwardXPResult>(
      `/v1/progression/characters/${characterId}/experience/award`,
      {
        method: 'POST',
        body: JSON.stringify({ xp, source, description }),
      }
    );

    this.cache.invalidate(
      `GET:/v1/progression/characters/${characterId}/progression`
    );
    return result;
  }

  async levelUp(
    characterId: string,
    choices: LevelUpRequest
  ): Promise<LevelUpResult> {
    const result = await this.request<LevelUpResult>(
      `/v1/progression/characters/${characterId}/level-up`,
      {
        method: 'POST',
        body: JSON.stringify(choices),
      }
    );

    this.invalidateCache(/\/v1\/characters\/${characterId}/);
    return result;
  }

  // ============================================================================
  // CLASS FEATURES API
  // ============================================================================

  async getCharacterFeatures(characterId: string): Promise<CharacterFeature[]> {
    const response = await this.request<{ features: CharacterFeature[] }>(
      `/v1/characters/${characterId}/features`
    );
    return response.features;
  }

  async useFeature(
    characterId: string,
    featureId: string,
    context?: string
  ): Promise<any> {
    const result = await this.request(
      `/v1/characters/${characterId}/features/${featureId}/use`,
      {
        method: 'POST',
        body: JSON.stringify({ context }),
      }
    );

    this.cache.invalidate(`GET:/v1/characters/${characterId}/features`);
    return result;
  }

  // ============================================================================
  // SPELL SLOTS API
  // ============================================================================

  async getSpellSlots(characterId: string): Promise<SpellSlot[]> {
    return this.request(`/v1/characters/${characterId}/spell-slots`);
  }

  async useSpellSlot(
    characterId: string,
    spellName: string,
    spellLevel: number,
    slotLevel: number
  ): Promise<UseSpellSlotResult> {
    const result = await this.request<UseSpellSlotResult>(
      `/v1/characters/${characterId}/spell-slots/use`,
      {
        method: 'POST',
        body: JSON.stringify({
          spellName,
          spellLevel,
          slotLevelUsed: slotLevel,
        }),
      }
    );

    this.cache.invalidate(`GET:/v1/characters/${characterId}/spell-slots`);
    return result;
  }

  async restoreSpellSlots(
    characterId: string,
    level?: number
  ): Promise<any> {
    const result = await this.request(
      `/v1/characters/${characterId}/spell-slots/restore`,
      {
        method: 'POST',
        body: JSON.stringify({ level }),
      }
    );

    this.cache.invalidate(`GET:/v1/characters/${characterId}/spell-slots`);
    return result;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createDndApiClient(config: ApiClientConfig): DndApiClient {
  return new DndApiClient(config);
}

// ============================================================================
// DEFAULT INSTANCE
// ============================================================================

// Create and export a default instance
export const dndApi = createDndApiClient({
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:4000',
  enableCaching: true,
  enableThrottling: false,
});

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Basic usage
import { dndApi } from './sample-api-client';

// Start combat
const combat = await dndApi.startCombat(sessionId, participants);

// Make an attack
const attackResult = await dndApi.makeAttack(encounterId, {
  attackerId: 'char-123',
  targetId: 'enemy-456',
  attackRoll: 18,
  attackBonus: 5,
  attackType: 'melee',
});

// Award XP
const xpResult = await dndApi.awardXP(characterId, 450, 'combat', 'Defeated goblins');

// Take a long rest
const restResult = await dndApi.takeLongRest(characterId);

// Cast a spell
const spellResult = await dndApi.useSpellSlot(characterId, 'Fireball', 3, 3);

// Error handling
try {
  await dndApi.makeAttack(encounterId, attackData);
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error(`API Error: ${error.message}`);
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      // Handle rate limiting
    }
  }
}
*/
