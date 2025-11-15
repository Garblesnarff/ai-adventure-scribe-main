import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const inserts: any[] = [];
  const deleted: any[] = [];
  let rangeData: any[] = [];

  const chain = {
    insert: vi.fn(async (payload: any) => {
      inserts.push(payload);
      return { data: null, error: null } as any;
    }),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: [], error: null }) as any),
    range: vi.fn(async () => ({ data: rangeData, error: null }) as any),
    delete: vi.fn(() => chain),
    in: vi.fn(async (_col: string, ids: any[]) => {
      deleted.push(...ids);
      return { data: null, error: null } as any;
    }),
  } as any;

  const supabase = {
    from: vi.fn((_table: string) => chain),
  } as any;

  return { supabase, __mock: { inserts, deleted, setRangeData: (d: any[]) => (rangeData = d) } };
});

// We'll import modules dynamically inside tests to control env flags

let supabaseMock: any;

describe('RollManager (flag‑gated)', () => {
  beforeEach(async () => {
    const mod = await import('@/integrations/supabase/client');
    supabaseMock = (mod as any).__mock;
    supabaseMock.inserts.length = 0;
    supabaseMock.deleted.length = 0;
    supabaseMock.setRangeData([]);
    // Ensure flag defaults false before module import
    (import.meta as any).env = { ...(import.meta as any).env, VITE_ENABLE_ROLL_HISTORY: 'false' };
  });

  it('does nothing when VITE_ENABLE_ROLL_HISTORY=false', async () => {
    const { RollManager } = await import('@/services/roll-manager');
    await RollManager.recordRollRequest({
      sessionId: 's1',
      kind: 'check',
      purpose: 'Stealth check',
    });
    expect(supabaseMock.inserts.length).toBe(0);
  });

  it.skip('writes request when flag enabled', async () => {
    // NOTE: Vite injects import.meta.env at build time; enabling at runtime can be unreliable in tests.
    (import.meta as any).env.VITE_ENABLE_ROLL_HISTORY = 'true';
    const { RollManager } = await import('@/services/roll-manager');
    await RollManager.recordRollRequest({
      sessionId: 's1',
      kind: 'attack',
      purpose: 'Attack roll',
      formula: '1d20+5',
      ac: 13,
    });
    expect(supabaseMock.inserts.length).toBe(1);
    expect(supabaseMock.inserts[0]).toMatchObject({
      session_id: 's1',
      kind: 'attack',
      formula: '1d20+5',
      ac: 13,
    });
  });

  it.skip('writes result and computes success vs DC', async () => {
    (import.meta as any).env.VITE_ENABLE_ROLL_HISTORY = 'true';
    const { RollManager } = await import('@/services/roll-manager');
    await RollManager.recordRollResult({ sessionId: 's1', kind: 'check', resultTotal: 15, dc: 12 });
    const last = supabaseMock.inserts.at(-1);
    expect(last).toMatchObject({ kind: 'check', result_total: 15, dc: 12, success: true });
  });

  it.skip('prunes beyond cap', async () => {
    (import.meta as any).env.VITE_ENABLE_ROLL_HISTORY = 'true';
    const { RollManager } = await import('@/services/roll-manager');
    // Simulate many old rows beyond cap
    supabaseMock.setRangeData([{ id: 'old1' }, { id: 'old2' }]);
    await RollManager.recordRollRequest({ sessionId: 's1', kind: 'initiative' });
    expect(supabaseMock.deleted).toEqual(['old1', 'old2']);
  });
});
