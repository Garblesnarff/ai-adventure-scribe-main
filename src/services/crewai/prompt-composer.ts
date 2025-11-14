import type { SessionStatePayload } from '@/types/session-state';

/**
 * PromptComposer
 * Utilities to compose structured context strings from session state and other inputs.
 */
export class PromptComposer {
  static buildStateSection(state: SessionStatePayload | null): string {
    if (!state) return '';

    const lines: string[] = [];
    lines.push('<session_state>');
    lines.push(`  <scene>${state.scene || 'Unknown'}</scene>`);
    if (state.combat) {
      lines.push(
        `  <combat status="${state.combat.active ? 'ACTIVE' : 'inactive'}" round="${state.combat.round}">`,
      );
      if (state.combat.order?.length) {
        lines.push('    <turn_order>');
        state.combat.order.forEach((c) => {
          lines.push(`      <combatant name="${c.name}" hp="${c.hp}" ac="${c.ac}"/>`);
        });
        lines.push('    </turn_order>');
      }
      lines.push('  </combat>');
    }
    if (state.quests?.length) {
      lines.push('  <quests>');
      state.quests.forEach((q) => {
        lines.push(`    <quest status="${q.status}">${q.summary}</quest>`);
      });
      lines.push('  </quests>');
    }
    lines.push('</session_state>');
    return '\n\n' + lines.join('\n');
  }
}

export const promptComposer = PromptComposer;
