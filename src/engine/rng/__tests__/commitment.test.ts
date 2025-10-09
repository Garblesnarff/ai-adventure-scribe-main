import { describe, it, expect } from 'vitest';
import { genServerSeed, hashServerSeed, hmacRoll, verifyRoll } from '../commitment';

describe('RNG Commitment', () => {
  it('generates consistent hashes for same seed', () => {
    const seed = 'test-seed-123';
    const hash1 = hashServerSeed(seed);
    const hash2 = hashServerSeed(seed);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // sha256 hex length
  });

  it('produces deterministic rolls with same inputs', () => {
    const serverSeed = 'deterministic-server-seed';
    const clientSeed = 'client-seed-456';
    const nonce = 1;
    const sides = 20;

    const roll1 = hmacRoll(serverSeed, clientSeed, nonce, sides);
    const roll2 = hmacRoll(serverSeed, clientSeed, nonce, sides);
    
    expect(roll1.value).toBe(roll2.value);
    expect(roll1.proof).toBe(roll2.proof);
    expect(roll1.value).toBeGreaterThanOrEqual(1);
    expect(roll1.value).toBeLessThanOrEqual(sides);
  });

  it('produces different values for different nonces', () => {
    const serverSeed = 'server-seed';
    const clientSeed = 'client-seed';
    const sides = 6;

    const roll1 = hmacRoll(serverSeed, clientSeed, 1, sides);
    const roll2 = hmacRoll(serverSeed, clientSeed, 2, sides);
    const roll3 = hmacRoll(serverSeed, clientSeed, 3, sides);

    // They should be different (extremely unlikely to be same)
    expect(roll1.value).not.toBe(roll2.value);
    expect(roll2.value).not.toBe(roll3.value);
  });

  it('verifies roll integrity correctly', () => {
    const serverSeed = 'verification-seed';
    const clientSeed = 'verification-client';
    const nonce = 42;
    const sides = 100;

    const { value, proof } = hmacRoll(serverSeed, clientSeed, nonce, sides);
    
    // Valid verification should pass
    expect(verifyRoll(serverSeed, clientSeed, nonce, sides, value, proof)).toBe(true);
    
    // Invalid verification should fail
    expect(verifyRoll(serverSeed, clientSeed, nonce, sides, value + 1, proof)).toBe(false);
    expect(verifyRoll(serverSeed, clientSeed, nonce + 1, sides, value, proof)).toBe(false);
    expect(verifyRoll('different-seed', clientSeed, nonce, sides, value, proof)).toBe(false);
  });

  it('generates unique server seeds', () => {
    const seed1 = genServerSeed();
    const seed2 = genServerSeed();
    
    expect(seed1).not.toBe(seed2);
    expect(seed1.length).toBe(64); // 32 bytes * 2 hex chars
    expect(seed2.length).toBe(64);
  });

  it('produces reproducible sequences across multiple implementations', () => {
    const serverSeed = 'reproducible-seed';
    const clientSeed = 'deterministic-test';
    
    const sequence: number[] = [];
    for (let i = 1; i <= 10; i++) {
      const roll = hmacRoll(serverSeed, clientSeed, i, 6);
      sequence.push(roll.value);
    }
    
    // Verify we can reproduce the exact same sequence
    const reproducedSequence: number[] = [];
    for (let i = 1; i <= 10; i++) {
      const roll = hmacRoll(serverSeed, clientSeed, i, 6);
      reproducedSequence.push(roll.value);
    }
    
    expect(sequence).toEqual(reproducedSequence);
  });
});
