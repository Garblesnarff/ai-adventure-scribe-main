// src/engine/rng/commitment.ts
import { createHmac, randomBytes, createHash } from 'node:crypto';

export interface RollCommitment {
  serverSeedHash: string; // sha256(serverSeed)
  clientSeed: string;
  nonce: number; // increments per roll
}

export function genServerSeed(): string {
  return randomBytes(32).toString('hex');
}

export function hashServerSeed(serverSeed: string): string {
  return createHash('sha256').update(serverSeed).digest('hex');
}

export function hmacRoll(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  sides: number
): { value: number; proof: string } {
  const msg = `${clientSeed}:${nonce}`;
  const hmac = createHmac('sha256', serverSeed).update(msg).digest('hex');
  const int = parseInt(hmac.slice(0, 12), 16); // 48 bits -> safe range
  const value = (int % sides) + 1;
  return { value, proof: hmac };
}

// Verify a roll was fair given the revealed server seed
export function verifyRoll(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  sides: number,
  expectedValue: number,
  expectedProof: string
): boolean {
  const { value, proof } = hmacRoll(serverSeed, clientSeed, nonce, sides);
  return value === expectedValue && proof === expectedProof;
}
