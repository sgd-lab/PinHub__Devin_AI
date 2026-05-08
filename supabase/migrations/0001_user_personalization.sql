-- PinHub — User Personalization Schema
-- Adds per-user onboarding, brand memory, and preferences linked to auth.users.id.
-- Idempotent: safe to re-run.

-- ───────────────────────────── user_profiles ─────────────────────────────
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  brand_name text,
  tagline text,
  main_niche text,
  sub_niches text[] not null default '{}',
  brand_colors jsonb not null default '[]'::jsonb, -- [{name, hex}]
  primary_market text default 'US, CA, UK',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_email_idx on public.user_profiles (email);

-- ───────────────────────────── brand_memory ─────────────────────────────
-- Stores creator memory accumulated over time:
--  kind: tone | favorite_style | selected_output | rejected_output | hook_style | keyword | forbidden
create table if not exists public.brand_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'tone',
    'favorite_style',
    'selected_output',
    'rejected_output',
    'hook_style',
    'keyword',
    'forbidden'
  )),
  value jsonb not null,
  weight real not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brand_memory_user_kind_idx on public.brand_memory (user_id, kind);
create index if not exists brand_memory_user_created_idx on public.brand_memory (user_id, created_at desc);

-- ───────────────────────────── user_preferences ─────────────────────────────
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  creator_tone text,
  favorite_styles text[] not null default '{}',
  preferred_hook_styles text[] not null default '{}',
  signature_openers text[] not null default '{}',
  power_words text[] not null default '{}',
  forbidden_words text[] not null default '{}',
  audience_address text,
  default_provider text,
  default_temperature real not null default 0.7,
  selected_outputs jsonb not null default '[]'::jsonb,
  rejected_outputs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────────── updated_at trigger ─────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists brand_memory_set_updated_at on public.brand_memory;
create trigger brand_memory_set_updated_at
  before update on public.brand_memory
  for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ───────────────────────────── RLS ─────────────────────────────
alter table public.user_profiles enable row level security;
alter table public.brand_memory enable row level security;
alter table public.user_preferences enable row level security;

-- user_profiles: each user sees only their own row
drop policy if exists "user_profiles select own" on public.user_profiles;
create policy "user_profiles select own"
  on public.user_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "user_profiles insert own" on public.user_profiles;
create policy "user_profiles insert own"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_profiles update own" on public.user_profiles;
create policy "user_profiles update own"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_profiles delete own" on public.user_profiles;
create policy "user_profiles delete own"
  on public.user_profiles for delete
  using (auth.uid() = user_id);

-- brand_memory
drop policy if exists "brand_memory select own" on public.brand_memory;
create policy "brand_memory select own"
  on public.brand_memory for select
  using (auth.uid() = user_id);

drop policy if exists "brand_memory insert own" on public.brand_memory;
create policy "brand_memory insert own"
  on public.brand_memory for insert
  with check (auth.uid() = user_id);

drop policy if exists "brand_memory update own" on public.brand_memory;
create policy "brand_memory update own"
  on public.brand_memory for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "brand_memory delete own" on public.brand_memory;
create policy "brand_memory delete own"
  on public.brand_memory for delete
  using (auth.uid() = user_id);

-- user_preferences
drop policy if exists "user_preferences select own" on public.user_preferences;
create policy "user_preferences select own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "user_preferences insert own" on public.user_preferences;
create policy "user_preferences insert own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences update own" on public.user_preferences;
create policy "user_preferences update own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences delete own" on public.user_preferences;
create policy "user_preferences delete own"
  on public.user_preferences for delete
  using (auth.uid() = user_id);

-- ───────────────────────────── auto-create profile on signup ─────────────────────────────
-- When a new auth.users row is inserted, seed an empty profile and preferences row
-- so the app can rely on their existence after first login.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
