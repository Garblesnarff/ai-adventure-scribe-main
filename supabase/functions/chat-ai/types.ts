/**
 * Interface for memory data structure
 */
export interface Memory {
  id: string;
  content: string;
  type: string;
  importance: number;
  embedding?: number[] | string | null;
  metadata: Record<string, any>;
  created_at: string;
  session_id?: string | null;
  updated_at: string;
}

/**
 * Interface for memory with relevance score
 */
export interface MemoryContext {
  memory: Memory;
  relevanceScore: number;
}

/**
 * Interface for message context data
 */
export interface MessageContext {
  location?: string | null;
  emotion?: string | null;
  intent?: string | null;
  [key: string]: string | null | undefined;
}