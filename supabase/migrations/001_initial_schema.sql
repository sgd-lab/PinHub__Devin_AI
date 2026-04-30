-- PinHub Initial Schema Migration
-- Creates all tables needed for the application

-- Pins table (previously 'runs' in Dexie)
CREATE TABLE IF NOT EXISTS pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  brand_id UUID,
  brand_snapshot JSONB DEFAULT '{}',
  prompt_template TEXT DEFAULT '',
  runtime_inputs JSONB DEFAULT '{}',
  raw_response TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  hashtags TEXT[] DEFAULT '{}',
  image_prompt_a TEXT DEFAULT '',
  image_prompt_b TEXT DEFAULT '',
  parsed_fields JSONB DEFAULT '{}',
  qc_score NUMERIC DEFAULT 0,
  qc_results JSONB DEFAULT '{"score": 0, "rules": []}',
  provider TEXT DEFAULT '',
  model TEXT DEFAULT '',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_estimate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Posted', 'Archived')),
  posted_date DATE,
  board TEXT DEFAULT '',
  niche TEXT DEFAULT '',
  target_date DATE,
  notes TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  guide_link TEXT DEFAULT '',
  run_type TEXT DEFAULT 'single' CHECK (run_type IN ('single', 'daily', 'mega', 'guide')),
  synced_to_notion BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_pins_niche ON pins(niche);
CREATE INDEX IF NOT EXISTS idx_pins_status ON pins(status);
CREATE INDEX IF NOT EXISTS idx_pins_target_date ON pins(target_date);
CREATE INDEX IF NOT EXISTS idx_pins_created_at ON pins(created_at);
CREATE INDEX IF NOT EXISTS idx_pins_run_type ON pins(run_type);
CREATE INDEX IF NOT EXISTS idx_pins_brand_id ON pins(brand_id);

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL DEFAULT '',
  tagline TEXT DEFAULT '',
  operator_name TEXT DEFAULT '',
  primary_market TEXT DEFAULT '',
  schema_version TEXT DEFAULT 'v2026.1',
  identity JSONB DEFAULT '{}',
  visual_system JSONB DEFAULT '{}',
  voice JSONB DEFAULT '{}',
  model_persona JSONB DEFAULT '{}',
  niches JSONB DEFAULT '[]',
  pinterest JSONB DEFAULT '{}',
  file_naming JSONB DEFAULT '{}',
  seo JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- Brand versions for history tracking
CREATE TABLE IF NOT EXISTS brand_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  snapshot JSONB DEFAULT '{}',
  change_summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_versions_brand_id ON brand_versions(brand_id);

-- Prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL DEFAULT '',
  version TEXT DEFAULT '1.0',
  description TEXT DEFAULT '',
  prompt_text TEXT DEFAULT '',
  variable_bindings JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '[]',
  compatible_generators TEXT[] DEFAULT '{}',
  qc_rules JSONB DEFAULT '[]',
  estimated_input_tokens INTEGER DEFAULT 0,
  estimated_output_tokens INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  average_qc_score NUMERIC DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);

-- Prompt versions
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);

-- Library items (aggregated view items)
CREATE TABLE IF NOT EXISTS library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID REFERENCES pins(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT DEFAULT '',
  niche TEXT DEFAULT '',
  status TEXT DEFAULT 'Draft',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_library_items_pin_id ON library_items(pin_id);

-- Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID REFERENCES pins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  event_date DATE NOT NULL,
  niche TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  event_type TEXT DEFAULT 'pin' CHECK (event_type IN ('pin', 'guide', 'milestone', 'reminder')),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_pin_id ON calendar_events(pin_id);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  provider TEXT DEFAULT '',
  model TEXT DEFAULT '',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  run_id UUID
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- QC Rules
CREATE TABLE IF NOT EXISTS qc_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  rule_type TEXT NOT NULL,
  target_field TEXT DEFAULT '',
  params JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'warn' CHECK (severity IN ('hard_fail', 'warn', 'soft_check')),
  message TEXT DEFAULT '',
  fix_hint TEXT DEFAULT '',
  enabled BOOLEAN DEFAULT TRUE
);

-- Export history
CREATE TABLE IF NOT EXISTS export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  filename TEXT DEFAULT '',
  format TEXT DEFAULT '',
  record_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_export_history_created_at ON export_history(created_at);

-- App settings (key-value store for cumulative costs, preferences, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Notion connection info
CREATE TABLE IF NOT EXISTS notion_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  api_key_ref TEXT DEFAULT '',
  database_id TEXT DEFAULT '',
  enabled BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  sync_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Cost log (for cost meter tracking)
CREATE TABLE IF NOT EXISTS cost_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  provider TEXT NOT NULL DEFAULT '',
  model TEXT DEFAULT '',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  run_id TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_cost_log_date ON cost_log(date);
CREATE INDEX IF NOT EXISTS idx_cost_log_provider ON cost_log(provider);

-- Research cache
CREATE TABLE IF NOT EXISTS research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche TEXT NOT NULL DEFAULT '',
  week_of TEXT DEFAULT '',
  data JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_cache_niche ON research_cache(niche);

-- Enable Row Level Security on all tables (open for now since no auth)
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_cache ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for anon access (single-user app, no auth)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for anon" ON pins;
  DROP POLICY IF EXISTS "Allow all for anon" ON brands;
  DROP POLICY IF EXISTS "Allow all for anon" ON brand_versions;
  DROP POLICY IF EXISTS "Allow all for anon" ON prompts;
  DROP POLICY IF EXISTS "Allow all for anon" ON prompt_versions;
  DROP POLICY IF EXISTS "Allow all for anon" ON library_items;
  DROP POLICY IF EXISTS "Allow all for anon" ON calendar_events;
  DROP POLICY IF EXISTS "Allow all for anon" ON analytics_events;
  DROP POLICY IF EXISTS "Allow all for anon" ON qc_rules;
  DROP POLICY IF EXISTS "Allow all for anon" ON export_history;
  DROP POLICY IF EXISTS "Allow all for anon" ON app_settings;
  DROP POLICY IF EXISTS "Allow all for anon" ON notion_connection;
  DROP POLICY IF EXISTS "Allow all for anon" ON cost_log;
  DROP POLICY IF EXISTS "Allow all for anon" ON research_cache;
END $$;

CREATE POLICY "Allow all for anon" ON pins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON brand_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON prompts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON prompt_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON library_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON calendar_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON analytics_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON qc_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON export_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON notion_connection FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON cost_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON research_cache FOR ALL USING (true) WITH CHECK (true);
