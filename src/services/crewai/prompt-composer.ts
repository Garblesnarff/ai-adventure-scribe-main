import type { SessionStatePayload } from '@/types/session-state';

/**
 * PromptComposer
 * Utilities to compose structured context strings from session state and other inputs.
 */
export class PromptComposer {
  static buildStateSection(state: SessionStatePayload | null): string {
    if (!state) return '';

    const lines: string[] = [];
    lines.push('SESSION STATE SNAPSHOT:');
    lines.push(`Scene: ${state.scene || 'Unknown'}`);
    if (state.combat) {
      lines.push(`Combat: ${state.combat.active ? 'ACTIVE' : 'inactive'} | Round: ${state.combat.round}`);
      if (state.combat.order?.length) {
        const order = state.combat.order.map(c => `${c.name}(HP:${c.hp}, AC:${c.ac})`).join(', ');
        lines.push(`Turn Order: ${order}`);
      }
    }
    if (state.quests?.length) {
      const quests = state.quests.map(q => `${q.summary} [${q.status}]`).join(' | ');
      lines.push(`Quests: ${quests}`);
    }
    return '\n\n' + lines.join('\n');
  }
}

export const promptComposer = PromptComposer;
