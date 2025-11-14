/**
 * Memory Manager
 *
 * This file defines the MemoryManager class, primarily responsible for loading
 * recent memories for a given game session from the Supabase database.
 *
 * Main Class:
 * - MemoryManager: Loads recent memories.
 *
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - Memory types from `@/components/game/memory/types`.
 *
 * @author AI Dungeon Master Team
 */

import { Memory } from '@/components/game/memory/types';
import { MemoryService } from './MemoryService';

export class MemoryManager {
  async loadRecentMemories(sessionId: string): Promise<Memory[]> {
    return await MemoryService.loadRecentMemories(sessionId);
  }
}
