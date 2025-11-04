-- Migration: Add sequence numbers to dialogue_history for proper message ordering
-- This ensures messages are correctly ordered even with concurrent inserts from multiple tabs

BEGIN;

-- Add sequence_number column (nullable initially for backfill)
ALTER TABLE dialogue_history
ADD COLUMN sequence_number INTEGER;

-- Create a trigger function to automatically assign sequence numbers on insert
-- This uses advisory locks to prevent concurrent sequence conflicts
CREATE OR REPLACE FUNCTION assign_message_sequence_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_seq integer;
  lock_key bigint;
BEGIN
  -- Only assign if sequence_number is not already set
  IF NEW.sequence_number IS NULL THEN
    -- Create a unique lock key from the session_id UUID
    -- This ensures only one transaction can assign sequences for a session at a time
    lock_key := ('x' || substring(NEW.session_id::text, 1, 16))::bit(64)::bigint;

    -- Acquire advisory lock for this session
    PERFORM pg_advisory_xact_lock(lock_key);

    -- Get the next sequence number for this session
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO next_seq
    FROM dialogue_history
    WHERE session_id = NEW.session_id;

    -- Assign the sequence number
    NEW.sequence_number := next_seq;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION assign_message_sequence_number IS 'Trigger function that automatically assigns sequence numbers to new messages with advisory locking';

-- Create the trigger
CREATE TRIGGER trg_assign_message_sequence
  BEFORE INSERT ON dialogue_history
  FOR EACH ROW
  EXECUTE FUNCTION assign_message_sequence_number();

COMMENT ON TRIGGER trg_assign_message_sequence ON dialogue_history IS 'Automatically assigns sequence numbers to messages on insert';

-- Also create a helper function for manual use if needed
CREATE OR REPLACE FUNCTION get_next_message_sequence(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  next_seq integer;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_seq
  FROM dialogue_history
  WHERE session_id = p_session_id;

  RETURN next_seq;
END;
$$;

COMMENT ON FUNCTION get_next_message_sequence IS 'Helper function to get the next sequence number for a session (mainly for testing)';

-- Backfill existing messages with sequence numbers based on timestamp order
-- This ensures existing messages maintain their current order
WITH numbered_messages AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY timestamp ASC, created_at ASC, id ASC) as seq
  FROM dialogue_history
  WHERE sequence_number IS NULL
)
UPDATE dialogue_history
SET sequence_number = numbered_messages.seq
FROM numbered_messages
WHERE dialogue_history.id = numbered_messages.id;

-- Now make sequence_number NOT NULL after backfill
ALTER TABLE dialogue_history
ALTER COLUMN sequence_number SET NOT NULL;

-- Create unique constraint on (session_id, sequence_number)
-- This prevents duplicate sequence numbers within a session
CREATE UNIQUE INDEX idx_dialogue_sequence
ON dialogue_history(session_id, sequence_number);

-- Add a comment to document the column
COMMENT ON COLUMN dialogue_history.sequence_number IS 'Monotonically increasing sequence number for message ordering within a session. Prevents ordering issues with concurrent inserts.';

-- Create an index for efficient ordering queries
CREATE INDEX idx_dialogue_session_sequence
ON dialogue_history(session_id, sequence_number);

COMMIT;
