import { supabase } from '@/integrations/supabase/client';
import { EnhancedMemory, MemoryQueryOptions } from '@/agents/crewai/types/memory';
import { Json } from '@/integrations/supabase/types';

export class EnhancedMemoryManager {
  private sessionId: string;
  private currentState: EnhancedMemory['context']['sceneState'] | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async storeMemory(
    content: string,
    type: EnhancedMemory['type'],
    category: EnhancedMemory['category'],
    context: Partial<EnhancedMemory['context']> = {}
  ): Promise<void> {
    const importance = this.calculateImportance(content, type, category);
    
    // Serialize the context and metadata for Supabase storage
    const metadata = {
      category,
      context: JSON.stringify({
        ...context,
        sceneState: this.currentState
      }),
      timestamp: new Date().toISOString()
    };

    console.log('[Memory] Storing new memory:', { type, category, importance });

    const { error } = await supabase
      .from('memories')
      .insert({
        session_id: this.sessionId,
        type,
        content,
        importance,
        metadata
      });

    if (error) {
      console.error('[Memory] Error storing memory:', error);
      throw error;
    }

    await this.updateSceneState({
      type,
      content,
      context,
      category,
      importance,
      metadata,
    } as Partial<EnhancedMemory>);
  }

  async retrieveMemories(options: MemoryQueryOptions = {}): Promise<EnhancedMemory[]> {
    console.log('[Memory] Retrieving memories with options:', options);

    let query = supabase
      .from('memories')
      .select('*')
      .eq('session_id', this.sessionId)
      .order('created_at', { ascending: false });

    if (options.category) {
      query = query.eq('metadata->category', options.category);
    }

    if (options.timeframe === 'recent') {
      const recentTime = new Date();
      recentTime.setMinutes(recentTime.getMinutes() - 30);
      query = query.gte('created_at', recentTime.toISOString());
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Memory] Error retrieving memories:', error);
      throw error;
    }

    return data.map(this.transformDatabaseMemory);
  }

  private calculateImportance(
    content: string,
    type: EnhancedMemory['type'],
    category: EnhancedMemory['category']
  ): number {
    let importance = 0;

    // Base importance by type
    switch (type) {
      case 'action':
        importance += 3; // Player actions are highly important
        break;
      case 'dialogue':
        importance += 2;
        break;
      case 'scene_state':
        importance += 2;
        break;
      case 'description':
        importance += 1;
        break;
    }

    // Additional importance by category
    switch (category) {
      case 'player_action':
        importance += 2;
        break;
      case 'npc':
        importance += 1;
        break;
      case 'location':
        importance += 1;
        break;
    }

    // Content-based importance
    if (content.includes('quest') || content.includes('mission')) importance += 1;
    if (content.includes('danger') || content.includes('threat')) importance += 1;
    if (content.length > 200) importance += 1; // Detailed descriptions

    return Math.min(10, importance); // Cap at 10
  }

  private async updateSceneState(memory: Partial<EnhancedMemory>): Promise<void> {
    if (!this.currentState) {
      this.currentState = {
        currentLocation: '',
        activeNPCs: [],
        environmentDetails: {
          atmosphere: '',
          timeOfDay: '',
          sensoryDetails: []
        },
        playerState: {
          lastAction: ''
        }
      };
    }

    // Update state based on memory type
    switch (memory.type) {
      case 'action':
        this.currentState.playerState.lastAction = memory.content || '';
        break;
      case 'scene_state':
        if (memory.context?.location) {
          this.currentState.currentLocation = memory.context.location;
        }
        if (memory.context?.npcs) {
          this.updateActiveNPCs(memory.context.npcs);
        }
        break;
    }

    console.log('[Memory] Updated scene state:', this.currentState);
  }

  private updateActiveNPCs(npcs: string[]): void {
    // Add new NPCs
    for (const npc of npcs) {
      if (!this.currentState?.activeNPCs.find(n => n.name === npc)) {
        this.currentState?.activeNPCs.push({
          id: npc.toLowerCase().replace(/\s+/g, '_'),
          name: npc,
          status: 'present'
        });
      }
    }

    // Mark absent NPCs as departed
    if (this.currentState) {
      this.currentState.activeNPCs = this.currentState.activeNPCs.map(npc => ({
        ...npc,
        status: npcs.includes(npc.name) ? 'present' : 'departed'
      }));
    }
  }

  private transformDatabaseMemory(dbMemory: any): EnhancedMemory {
    const metadata = dbMemory.metadata || {};
    const context = metadata.context ? JSON.parse(metadata.context) : {};
    
    return {
      id: dbMemory.id,
      type: dbMemory.type,
      content: dbMemory.content,
      timestamp: dbMemory.created_at,
      importance: dbMemory.importance || 0,
      category: metadata.category || 'general',
      context,
      metadata: dbMemory.metadata || {}
    };
  }
}
