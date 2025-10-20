BEGIN;

-- Schema to hold admin/debug helpers
CREATE SCHEMA IF NOT EXISTS admin;

-- Simulate RLS as a specific user by setting request.jwt.claims and role
-- Executes arbitrary SELECT text and returns visible rows as JSONB
CREATE OR REPLACE FUNCTION admin.simulate_rls_for_user(
  p_user_id uuid,
  p_sql text,
  p_role text DEFAULT 'authenticated',
  p_extra_claims jsonb DEFAULT '{}'::jsonb
) RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_claims text;
BEGIN
  -- Save current claims
  prev_claims := current_setting('request.jwt.claims', true);

  -- Set JWT claims and DB role for the duration of this transaction
  PERFORM set_config(
    'request.jwt.claims',
    (jsonb_build_object('sub', p_user_id::text, 'role', p_role) || COALESCE(p_extra_claims, '{}'::jsonb))::text,
    true
  );
  EXECUTE format('SET LOCAL ROLE %I', p_role);

  -- Run caller-provided SELECT under simulated context and return rows
  RETURN QUERY EXECUTE format('SELECT to_jsonb(q) FROM (%s) q', p_sql);

  -- Restore previous context
  IF prev_claims IS NULL THEN
    PERFORM set_config('request.jwt.claims', '', true);
  ELSE
    PERFORM set_config('request.jwt.claims', prev_claims, true);
  END IF;
  RESET ROLE;
  RETURN;

EXCEPTION WHEN OTHERS THEN
  -- Always restore on error, then re-raise
  IF prev_claims IS NULL THEN
    PERFORM set_config('request.jwt.claims', '', true);
  ELSE
    PERFORM set_config('request.jwt.claims', prev_claims, true);
  END IF;
  RESET ROLE;
  RAISE;
END;
$$;

-- Lock down access; only service_role should execute
REVOKE ALL ON SCHEMA admin FROM PUBLIC;
GRANT USAGE ON SCHEMA admin TO service_role;
GRANT EXECUTE ON FUNCTION admin.simulate_rls_for_user(uuid, text, text, jsonb) TO service_role;

COMMIT;
