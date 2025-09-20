-- Add vector embeddings support to memories table
-- This enables semantic search for memory retrieval

-- Enable the vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to memories table
ALTER TABLE memories
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_memories_embedding
ON memories USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add RPC function for semantic memory search
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  session_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  type text,
  content text,
  importance integer,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  narrative_weight integer,
  emotional_tone text,
  story_arc text,
  prose_quality boolean,
  chapter_marker boolean,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id,
    m.session_id,
    m.type,
    m.content,
    m.importance,
    m.metadata,
    m.created_at,
    m.updated_at,
    m.narrative_weight,
    m.emotional_tone,
    m.story_arc,
    m.prose_quality,
    m.chapter_marker,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.session_id = match_memories.session_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION match_memories IS 'Semantic search for memories using vector similarity';
COMMENT ON COLUMN memories.embedding IS 'OpenAI text-embedding-ada-002 vector for semantic search';