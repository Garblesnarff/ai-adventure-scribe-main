import type { EnhancedMemory } from '@/types/memory';

interface SceneState {
  currentLocation: string;
  activeNPCs: Array<{ id: string; name: string; status: 'present' | 'departed' | 'inactive' }>;
  environmentDetails: {
    atmosphere: string;
    timeOfDay: string;
    sensoryDetails: string[];
  };
  playerState: {
    lastAction: string;
    currentInteraction?: string;
  };
}

export class SceneStateTracker {
  private state: SceneState | null = null;

  public updateFromMemory(memory: Partial<EnhancedMemory>): void {
    if (!this.state) {
      this.state = {
        currentLocation: '',
        activeNPCs: [],
        environmentDetails: { atmosphere: '', timeOfDay: '', sensoryDetails: [] },
        playerState: { lastAction: '' },
      };
    }

    switch (memory.type) {
      case 'action':
        this.state.playerState.lastAction = memory.content || '';
        break;
      case 'scene_state':
        if (memory.context?.location) {
          this.state.currentLocation = memory.context.location;
        }
        if (memory.context?.npcs) {
          this.updateActiveNPCs(memory.context.npcs);
        }
        break;
      default:
        break;
    }
  }

  public snapshot(): SceneState | null {
    if (!this.state) return null;
    return {
      ...this.state,
      activeNPCs: this.state.activeNPCs.map((npc) => ({ ...npc })),
    };
  }

  private updateActiveNPCs(npcs: string[]): void {
    if (!this.state) return;
    for (const npc of npcs) {
      if (!this.state.activeNPCs.find((n) => n.name === npc)) {
        this.state.activeNPCs.push({
          id: npc.toLowerCase().replace(/\s+/g, '_'),
          name: npc,
          status: 'present',
        });
      }
    }

    this.state.activeNPCs = this.state.activeNPCs.map((npc) => ({
      ...npc,
      status: npcs.includes(npc.name) ? 'present' : 'departed',
    }));
  }
}
