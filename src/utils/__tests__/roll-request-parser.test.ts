import { describe, it, expect } from 'vitest';

import { parseRollRequests, containsAC } from '@/utils/rollRequestParser';

describe('rollRequestParser', () => {
  it('parses skill check with DC', () => {
    const msg = 'Roll for Stealth (DC 14)';
    const out = parseRollRequests(msg);
    expect(out.length).toBeGreaterThan(0);
    const rr = out.find((r) => r.type === 'check');
    expect(rr).toBeTruthy();
    expect(rr!.purpose?.toLowerCase()).toContain('stealth');
    expect(rr!.dc).toBe(14);
  });

  it('parses attack roll with AC', () => {
    const msg = 'Make an attack roll with your longsword (1d20+5) against AC 15';
    const out = parseRollRequests(msg);
    expect(out.some((r) => r.type === 'attack')).toBe(true);
    expect(containsAC(msg)).toBe(true);
  });

  it('parses damage roll with explicit dice', () => {
    const msg = 'Roll 1d8+3 for damage';
    const out = parseRollRequests(msg);
    expect(out.some((r) => r.type === 'damage')).toBe(true);
  });
});
