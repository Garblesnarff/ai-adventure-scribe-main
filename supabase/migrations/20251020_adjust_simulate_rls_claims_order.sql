BEGIN;

-- Ensure our enforced claims (sub, role) cannot be overridden by extras
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
  prev_claims := current_setting('request.jwt.claims', true);

  -- Merge extras first, then enforce sub and role to take precedence
  PERFORM set_config(
    'request.jwt.claims',
    (COALESCE(p_extra_claims, '{}'::jsonb) || jsonb_build_object('sub', p_user_id::text, 'role', p_role))::text,
    true
  );
  EXECUTE format('SET LOCAL ROLE %I', p_role);

  RETURN QUERY EXECUTE format('SELECT to_jsonb(q) FROM (%s) q', p_sql);

  IF prev_claims IS NULL THEN
    PERFORM set_config('request.jwt.claims', '', true);
  ELSE
    PERFORM set_config('request.jwt.claims', prev_claims, true);
  END IF;
  RESET ROLE;
  RETURN;

EXCEPTION WHEN OTHERS THEN
  IF prev_claims IS NULL THEN
    PERFORM set_config('request.jwt.claims', '', true);
  ELSE
    PERFORM set_config('request.jwt.claims', prev_claims, true);
  END IF;
  RESET ROLE;
  RAISE;
END;
$$;

COMMIT;
