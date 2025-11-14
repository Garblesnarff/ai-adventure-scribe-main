/**
 * Mock Database Implementation
 *
 * Provides an in-memory mock database for unit tests
 * Mimics Drizzle ORM API without requiring actual database connection
 */

import { vi } from 'vitest';

/**
 * Type for storing mock data
 */
type MockDataStore = Map<string, any[]>;

/**
 * Mock query builder that supports Drizzle-like chaining
 */
class MockQueryBuilder {
  private tableName: string;
  private dataStore: MockDataStore;
  private whereClause: any = null;
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private orderByClause: any[] = [];

  constructor(tableName: string, dataStore: MockDataStore) {
    this.tableName = tableName;
    this.dataStore = dataStore;
  }

  where(condition: any) {
    this.whereClause = condition;
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  offset(value: number) {
    this.offsetValue = value;
    return this;
  }

  orderBy(...clauses: any[]) {
    this.orderByClause = clauses;
    return this;
  }

  async findFirst(options?: { where?: any }) {
    const data = this.dataStore.get(this.tableName) || [];
    const condition = options?.where || this.whereClause;

    if (!condition) {
      return data[0] || null;
    }

    // Simple matching logic for mock
    const found = data.find((item) => this.matchesCondition(item, condition));
    return found || null;
  }

  async findMany(options?: { where?: any; limit?: number; offset?: number; orderBy?: any }) {
    const data = this.dataStore.get(this.tableName) || [];
    const condition = options?.where || this.whereClause;
    const limit = options?.limit || this.limitValue;
    const offset = options?.offset || this.offsetValue;

    let results = condition ? data.filter((item) => this.matchesCondition(item, condition)) : [...data];

    // Apply offset
    if (offset) {
      results = results.slice(offset);
    }

    // Apply limit
    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  private matchesCondition(item: any, condition: any): boolean {
    // Simple equality check for mock purposes
    // In a real implementation, this would handle complex where clauses
    if (typeof condition === 'function') {
      try {
        return condition(item);
      } catch {
        return false;
      }
    }

    // Handle object-based conditions
    if (typeof condition === 'object') {
      return Object.entries(condition).every(([key, value]) => item[key] === value);
    }

    return true;
  }
}

/**
 * Mock insert builder
 */
class MockInsertBuilder {
  private tableName: string;
  private dataStore: MockDataStore;
  private valuesData: any = null;

  constructor(tableName: string, dataStore: MockDataStore) {
    this.tableName = tableName;
    this.dataStore = dataStore;
  }

  values(data: any) {
    this.valuesData = Array.isArray(data) ? data : [data];
    return this;
  }

  async returning() {
    if (!this.valuesData) {
      throw new Error('No values provided for insert');
    }

    const data = this.dataStore.get(this.tableName) || [];

    // Add generated IDs if not present
    const inserted = this.valuesData.map((item: any) => ({
      id: item.id || `mock-id-${Date.now()}-${Math.random()}`,
      ...item,
      createdAt: item.createdAt || new Date(),
      updatedAt: item.updatedAt || new Date(),
    }));

    data.push(...inserted);
    this.dataStore.set(this.tableName, data);

    return inserted;
  }

  async execute() {
    return this.returning();
  }
}

/**
 * Mock update builder
 */
class MockUpdateBuilder {
  private tableName: string;
  private dataStore: MockDataStore;
  private setData: any = null;
  private whereClause: any = null;

  constructor(tableName: string, dataStore: MockDataStore) {
    this.tableName = tableName;
    this.dataStore = dataStore;
  }

  set(data: any) {
    this.setData = data;
    return this;
  }

  where(condition: any) {
    this.whereClause = condition;
    return this;
  }

  async returning() {
    if (!this.setData) {
      throw new Error('No data provided for update');
    }

    const data = this.dataStore.get(this.tableName) || [];
    const updated: any[] = [];

    const newData = data.map((item) => {
      if (!this.whereClause || this.matchesCondition(item, this.whereClause)) {
        const updatedItem = {
          ...item,
          ...this.setData,
          updatedAt: new Date(),
        };
        updated.push(updatedItem);
        return updatedItem;
      }
      return item;
    });

    this.dataStore.set(this.tableName, newData);
    return updated;
  }

  async execute() {
    return this.returning();
  }

  private matchesCondition(item: any, condition: any): boolean {
    if (typeof condition === 'function') {
      try {
        return condition(item);
      } catch {
        return false;
      }
    }

    if (typeof condition === 'object') {
      return Object.entries(condition).every(([key, value]) => item[key] === value);
    }

    return true;
  }
}

/**
 * Mock delete builder
 */
class MockDeleteBuilder {
  private tableName: string;
  private dataStore: MockDataStore;
  private whereClause: any = null;

  constructor(tableName: string, dataStore: MockDataStore) {
    this.tableName = tableName;
    this.dataStore = dataStore;
  }

  where(condition: any) {
    this.whereClause = condition;
    return this;
  }

  async returning() {
    const data = this.dataStore.get(this.tableName) || [];
    const deleted: any[] = [];

    const newData = data.filter((item) => {
      const matches = !this.whereClause || this.matchesCondition(item, this.whereClause);
      if (matches) {
        deleted.push(item);
        return false;
      }
      return true;
    });

    this.dataStore.set(this.tableName, newData);
    return deleted;
  }

  async execute() {
    return this.returning();
  }

  private matchesCondition(item: any, condition: any): boolean {
    if (typeof condition === 'function') {
      try {
        return condition(item);
      } catch {
        return false;
      }
    }

    if (typeof condition === 'object') {
      return Object.entries(condition).every(([key, value]) => item[key] === value);
    }

    return true;
  }
}

/**
 * Create a mock database instance
 */
export function createMockDatabase() {
  const dataStore: MockDataStore = new Map();

  // Initialize empty tables
  const tables = [
    'characters',
    'character_stats',
    'campaigns',
    'game_sessions',
    'combat_encounters',
    'combat_participants',
    'combat_participant_status',
    'combat_damage_log',
    'combat_participant_conditions',
    'conditions_library',
    'inventory_items',
    'consumable_usage_log',
    'level_progression',
    'experience_events',
    'rest_events',
    'character_hit_dice',
    'character_spell_slots',
    'spell_slot_usage_log',
  ];

  tables.forEach((table) => dataStore.set(table, []));

  const db = {
    // Query API (for select operations)
    query: new Proxy(
      {},
      {
        get: (target, tableName: string) => {
          return {
            findFirst: vi.fn(async (options?: any) => {
              const builder = new MockQueryBuilder(tableName, dataStore);
              return builder.findFirst(options);
            }),
            findMany: vi.fn(async (options?: any) => {
              const builder = new MockQueryBuilder(tableName, dataStore);
              return builder.findMany(options);
            }),
          };
        },
      }
    ),

    // Direct table access for insert/update/delete
    select: vi.fn((options?: any) => {
      return {
        from: vi.fn((table: any) => {
          const tableName = table?.name || 'unknown';
          return new MockQueryBuilder(tableName, dataStore);
        }),
      };
    }),

    insert: vi.fn((table: any) => {
      const tableName = table?.name || 'unknown';
      return new MockInsertBuilder(tableName, dataStore);
    }),

    update: vi.fn((table: any) => {
      const tableName = table?.name || 'unknown';
      return new MockUpdateBuilder(tableName, dataStore);
    }),

    delete: vi.fn((table: any) => {
      const tableName = table?.name || 'unknown';
      return new MockDeleteBuilder(tableName, dataStore);
    }),

    // Helper methods for test setup
    setData: (tableName: string, data: any[]) => {
      dataStore.set(tableName, data);
    },

    getData: (tableName: string) => {
      return dataStore.get(tableName) || [];
    },

    clear: (tableName?: string) => {
      if (tableName) {
        dataStore.set(tableName, []);
      } else {
        tables.forEach((table) => dataStore.set(table, []));
      }
    },

    clearAll: () => {
      tables.forEach((table) => dataStore.set(table, []));
    },
  };

  return db;
}

/**
 * Type for mock database
 */
export type MockDatabase = ReturnType<typeof createMockDatabase>;
