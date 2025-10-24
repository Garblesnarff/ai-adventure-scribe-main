CREATE TABLE blog_ai_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  api_token TEXT UNIQUE NOT NULL,
  rate_limit INT DEFAULT 10,
  requires_approval BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_blog_ai_authors_updated_at
BEFORE UPDATE ON blog_ai_authors
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Add RLS policies for the new table
ALTER TABLE blog_ai_authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access"
  ON blog_ai_authors
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access"
  ON blog_ai_authors
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
