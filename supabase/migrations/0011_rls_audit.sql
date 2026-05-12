-- 0011_rls_audit.sql
-- Lock down legacy single-tenant tables that still had an
-- `Allow all for anon` RLS policy (USING true / WITH CHECK true) from the
-- original "Maya Sofia private OS" era. None of these tables are
-- referenced by the multi-user codebase any more — every active flow uses
-- the user_id-scoped tables introduced in 0001–0010 (`library_items`,
-- `calendar_entries`, `brand_memory`, `user_*`, etc.).
--
-- Dropping the permissive policy converts each table back to the default
-- "RLS enabled + no policy = deny all" stance for the anon + authenticated
-- roles. Service role still bypasses RLS, which is fine because the
-- server never touches these tables.
--
-- Also revoke EXECUTE on `handle_new_auth_user()` (a SECURITY DEFINER
-- trigger function) from the anon/authenticated roles so it cannot be
-- called via `/rest/v1/rpc/handle_new_auth_user`. It is still callable
-- from the `auth.users` insert trigger because triggers run with the
-- table owner's privileges.

DO $$
DECLARE
  t text;
  legacy_tables text[] := ARRAY[
    'analytics_events',
    'app_settings',
    'brand_versions',
    'brands',
    'calendar_events',
    'cost_log',
    'export_history',
    'notion_connection',
    'pins',
    'prompt_versions',
    'prompts',
    'qc_rules',
    'research_cache'
  ];
BEGIN
  FOREACH t IN ARRAY legacy_tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS "Allow all for anon" ON public.%I',
        t
      );
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- Tighten the auth signup helper. It still works as a trigger because
-- triggers execute with the trigger owner's privileges, not the caller's.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_auth_user'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon, authenticated, public';
  END IF;
END $$;
