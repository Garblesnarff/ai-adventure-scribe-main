import { describe, it, expect } from 'vitest';
import { parseRollRequests, containsAC } from '@/utils/rollRequestParser';

describe('rollRequestParser', () => {
  it('parses skill check with DC', () => {
    const msg = 'Roll for Stealth (DC 14)';
    const out = parseRollRequests(msg);
    expect(out.length).toBeGreaterThan(0);
    const rr = out.find(r => r.type === 'check');
    expect(rr).toBeTruthy();
    expect(rr!.purpose?.toLowerCase()).toContain('stealth');
    expect(rr!.dc).toBe(14);
  });

  it('parses attack roll with AC', () => {
    const msg = 'Make an attack roll with your longsword (1d20+5) against AC 15';
    const out = parseRollRequests(msg);
    expect(out.some(r => r.type === 'attack')).toBe(true);
    expect(containsAC(msg)).toBe(true);
  });

  it('parses damage roll with explicit dice', () => {
    const msg = 'Roll 1d8+3 for damage';
    const out = parseRollRequests(msg);
    expect(out.some(r => r.type === 'damage')).toBe(true);
  });

  it('parses structured ROLL_REQUESTS_V1 block', () => {
    const msg = `You steady your breathing and look for an opening.\n\n\`\`\`ROLL_REQUESTS_V1\n{"rolls":[{"type":"skill_check","formula":"1d20+modifier","purpose":"Stealth check to remain hidden","dc":13}]}\n\`\`\``;
    const out = parseRollRequests(msg);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('skill_check');
    expect(out[0].purpose).toContain('Stealth');
    expect(out[0].dc).toBe(13);
    expect(out[0].confidence).toBeGreaterThan(0.9);
  });

  it('parses inline JSON roll_requests array', () => {
    const msg = '{"text":"Make your move.","roll_requests":[{"type":"attack","formula":"1d20+5","purpose":"Longsword attack","ac":14}] }';
    const out = parseRollRequests(msg);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('attack');
    expect(out[0].ac).toBe(14);
    expect(out[0].formula).toBe('1d20+5');
  });
});
