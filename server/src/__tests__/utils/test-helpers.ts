/**
 * Test Utilities and Helpers
 *
 * Common utility functions for unit tests
 */

/**
 * Assert that a function throws a specific error
 */
export function expectToThrow(fn: () => any, errorClass: any, message?: string) {
  try {
    fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (!(error instanceof errorClass)) {
      throw new Error(
        `Expected error to be instance of ${errorClass.name}, but got ${(error as any).constructor.name}`
      );
    }
    if (message && (error as Error).message !== message) {
      throw new Error(`Expected error message "${message}", but got "${(error as Error).message}"`);
    }
  }
}

/**
 * Assert that an async function throws a specific error
 */
export async function expectToThrowAsync(
  fn: () => Promise<any>,
  errorClass: any,
  message?: string
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected async function to throw, but it did not');
  } catch (error) {
    if (!(error instanceof errorClass)) {
      throw new Error(
        `Expected error to be instance of ${errorClass.name}, but got ${(error as any).constructor.name}`
      );
    }
    if (message && (error as Error).message !== message) {
      throw new Error(`Expected error message "${message}", but got "${(error as Error).message}"`);
    }
  }
}

/**
 * Generate a unique test ID with optional prefix
 */
export function createTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Create a mock request object for API tests
 */
export function createMockRequest(body: any, params: any = {}, user: any = null) {
  return {
    body,
    params,
    user: user || { id: 'test-user-1', email: 'test@example.com' },
    query: {},
    headers: {},
  };
}

/**
 * Create a mock response object for API tests
 */
export function createMockResponse() {
  const res: any = {
    statusCode: 200,
    data: null,
  };

  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };

  res.json = (data: any) => {
    res.data = data;
    return res;
  };

  res.send = (data: any) => {
    res.data = data;
    return res;
  };

  return res;
}

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a date string in ISO format for consistent test dates
 */
export function createTestDate(daysOffset: number = 0): Date {
  const date = new Date('2024-01-01T00:00:00Z');
  date.setDate(date.getDate() + daysOffset);
  return date;
}

/**
 * Deep clone an object (useful for fixture manipulation)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Calculate ability modifier from ability score (D&D 5E rule)
 */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Calculate proficiency bonus from level (D&D 5E rule)
 */
export function proficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

/**
 * Roll a die (for tests that need random values)
 * Uses seeded random for reproducible tests
 */
export function rollDie(sides: number, seed?: number): number {
  if (seed !== undefined) {
    // Simple seeded random using linear congruential generator
    const x = Math.sin(seed++) * 10000;
    const random = x - Math.floor(x);
    return Math.floor(random * sides) + 1;
  }
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice and sum the results
 */
export function rollDice(count: number, sides: number, seed?: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += rollDie(sides, seed ? seed + i : undefined);
  }
  return total;
}

/**
 * Parse dice notation (e.g., "2d6+3") and return total
 * For testing purposes, returns average roll
 */
export function parseDiceNotation(notation: string): number {
  const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) {
    throw new Error(`Invalid dice notation: ${notation}`);
  }

  const count = parseInt(match[1]!, 10);
  const sides = parseInt(match[2]!, 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  // Return average roll for consistent tests
  const average = count * ((sides + 1) / 2);
  return Math.floor(average + modifier);
}

/**
 * Create a mock database transaction
 */
export function createMockTransaction(db: any) {
  const originalData = new Map();

  return {
    commit: async () => {
      // Transaction successful, keep changes
      originalData.clear();
    },
    rollback: async () => {
      // Restore original data
      originalData.forEach((data, table) => {
        db.setData(table, data);
      });
      originalData.clear();
    },
    savepoint: (table: string) => {
      originalData.set(table, [...db.getData(table)]);
    },
  };
}

/**
 * Assert two objects are deeply equal
 */
export function assertDeepEqual(actual: any, expected: any, path: string = 'root'): void {
  if (actual === expected) {
    return;
  }

  if (typeof actual !== typeof expected) {
    throw new Error(`Type mismatch at ${path}: expected ${typeof expected}, got ${typeof actual}`);
  }

  if (typeof actual === 'object' && actual !== null && expected !== null) {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();

    if (actualKeys.length !== expectedKeys.length) {
      throw new Error(
        `Key count mismatch at ${path}: expected ${expectedKeys.length}, got ${actualKeys.length}`
      );
    }

    for (const key of expectedKeys) {
      assertDeepEqual(actual[key], expected[key], `${path}.${key}`);
    }
    return;
  }

  throw new Error(`Value mismatch at ${path}: expected ${expected}, got ${actual}`);
}

/**
 * Suppress console output during tests
 */
export function suppressConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};

  return () => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  };
}

/**
 * Measure execution time of a function
 */
export async function measureExecutionTime(fn: () => Promise<any> | any): Promise<number> {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
}
