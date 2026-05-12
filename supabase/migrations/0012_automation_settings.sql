-- 0012_automation_settings.sql
-- Stores per-user automation preferences for the Automation Hub.
--
-- One row per user. The values are toggle/configuration flags only;
-- nothing here is sensitive. Used by:
--   - `app/automation/page.tsx`
--   - `app/api/automation/settings/route.ts` (read/write)
--   - `app/api/automation/calendar-fill/route.ts` (reads days_ahead)
--   - `app/api/automation/run-daily/route.ts` (reads auto_notion + content_type)
--   - `app/api/integrations/notion/push/route.ts` (reads auto_notion when invoked from a generator success handler)

CREATE TABLE IF NOT EXISTS public.automation_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Scheduled daily runs (manual trigger from UI today, optional cron later)
  daily_run_enabled boolean NOT NULL DEFAULT false,
  daily_run_time time NOT NULL DEFAULT '06:00',
  daily_content_type text NOT NULL DEFAULT 'daily',  -- "daily" | "single" | "three"

  -- Calendar fill — auto-create empty calendar entries N days ahead so the
  -- creator always sees an upcoming queue.
  calendar_fill_enabled boolean NOT NULL DEFAULT false,
  calendar_fill_days_ahead integer NOT NULL DEFAULT 7 CHECK (
    calendar_fill_days_ahead BETWEEN 1 AND 30
  ),

  -- Notion auto-sync — after a successful generation, automatically push
  -- the result to the user's connected Notion database (if integration
  -- exists in `user_integrations`).
  notion_auto_sync_enabled boolean NOT NULL DEFAULT false,

  -- Audit info; updated_at is bumped on every PATCH.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_settings select own"
  ON public.automation_settings;
CREATE POLICY "automation_settings select own"
  ON public.automation_settings
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "automation_settings insert own"
  ON public.automation_settings;
CREATE POLICY "automation_settings insert own"
  ON public.automation_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "automation_settings update own"
  ON public.automation_settings;
CREATE POLICY "automation_settings update own"
  ON public.automation_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "automation_settings delete own"
  ON public.automation_settings;
CREATE POLICY "automation_settings delete own"
  ON public.automation_settings
  FOR DELETE
  USING (auth.uid() = user_id);
