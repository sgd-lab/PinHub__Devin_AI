-- PinHub — Multi-provider AI keys + per-task model preferences
-- Linked to auth.users.id with per-user RLS. Idempotent.

-- ───────────────────────────── user_api_keys ─────────────────────────────
-- Per-user encrypted credentials for an external AI provider.
-- encrypted_key / iv / auth_tag are AES-256-GCM ciphertext + IV + tag,
-- all base64-encoded. The ciphertext is decrypted server-side only using
-- PINHUB_KEY_ENC_SECRET. The browser never receives encrypted_key.
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openrouter', 'gemini', 'grok', 'nvidia')),
  encrypted_key text not null,
  iv text not null,
  auth_tag text not null,
  key_hint text,
  is_valid boolean not null default true,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists user_api_keys_user_idx on public.user_api_keys (user_id);

-- ───────────────────────────── ai_provider_settings ─────────────────────────────
-- Per-user toggle + cached model list per provider.
create table if not exists public.ai_provider_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openrouter', 'gemini', 'grok', 'nvidia')),
  enabled boolean not null default true,
  default_model text,
  available_models jsonb not null default '[]'::jsonb,
  models_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists ai_provider_settings_user_idx on public.ai_provider_settings (user_id);

-- ───────────────────────────── user_model_preferences ─────────────────────────────
-- Per-user-per-task provider+model selection plus optional fallback.
create table if not exists public.user_model_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null check (task in ('pin', 'guide', 'inspiration', 'chat')),
  provider text not null check (provider in ('openrouter', 'gemini', 'grok', 'nvidia')),
  model text not null,
  fallback_provider text check (fallback_provider in ('openrouter', 'gemini', 'grok', 'nvidia')),
  fallback_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, task)
);

create index if not exists user_model_preferences_user_idx on public.user_model_preferences (user_id);

-- ───────────────────────────── updated_at triggers ─────────────────────────────
drop trigger if exists user_api_keys_set_updated_at on public.user_api_keys;
create trigger user_api_keys_set_updated_at
  before update on public.user_api_keys
  for each row execute function public.set_updated_at();

drop trigger if exists ai_provider_settings_set_updated_at on public.ai_provider_settings;
create trigger ai_provider_settings_set_updated_at
  before update on public.ai_provider_settings
  for each row execute function public.set_updated_at();

drop trigger if exists user_model_preferences_set_updated_at on public.user_model_preferences;
create trigger user_model_preferences_set_updated_at
  before update on public.user_model_preferences
  for each row execute function public.set_updated_at();

-- ───────────────────────────── RLS ─────────────────────────────
alter table public.user_api_keys enable row level security;
alter table public.ai_provider_settings enable row level security;
alter table public.user_model_preferences enable row level security;

-- user_api_keys
drop policy if exists "user_api_keys select own" on public.user_api_keys;
create policy "user_api_keys select own"
  on public.user_api_keys for select
  using (auth.uid() = user_id);

drop policy if exists "user_api_keys insert own" on public.user_api_keys;
create policy "user_api_keys insert own"
  on public.user_api_keys for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_api_keys update own" on public.user_api_keys;
create policy "user_api_keys update own"
  on public.user_api_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_api_keys delete own" on public.user_api_keys;
create policy "user_api_keys delete own"
  on public.user_api_keys for delete
  using (auth.uid() = user_id);

-- ai_provider_settings
drop policy if exists "ai_provider_settings select own" on public.ai_provider_settings;
create policy "ai_provider_settings select own"
  on public.ai_provider_settings for select
  using (auth.uid() = user_id);

drop policy if exists "ai_provider_settings insert own" on public.ai_provider_settings;
create policy "ai_provider_settings insert own"
  on public.ai_provider_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "ai_provider_settings update own" on public.ai_provider_settings;
create policy "ai_provider_settings update own"
  on public.ai_provider_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ai_provider_settings delete own" on public.ai_provider_settings;
create policy "ai_provider_settings delete own"
  on public.ai_provider_settings for delete
  using (auth.uid() = user_id);

-- user_model_preferences
drop policy if exists "user_model_preferences select own" on public.user_model_preferences;
create policy "user_model_preferences select own"
  on public.user_model_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "user_model_preferences insert own" on public.user_model_preferences;
create policy "user_model_preferences insert own"
  on public.user_model_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_model_preferences update own" on public.user_model_preferences;
create policy "user_model_preferences update own"
  on public.user_model_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_model_preferences delete own" on public.user_model_preferences;
create policy "user_model_preferences delete own"
  on public.user_model_preferences for delete
  using (auth.uid() = user_id);
