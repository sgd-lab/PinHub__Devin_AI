-- PinHub — External integrations (Notion first)
-- Per-user encrypted credentials for third-party services. AES-256-GCM
-- ciphertext + IV + auth tag (base64), decrypted server-side only using
-- PINHUB_KEY_ENC_SECRET. Browser never receives encrypted_token.

create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration text not null check (integration in ('notion')),
  encrypted_token text,
  iv text,
  auth_tag text,
  token_hint text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'invalid')),
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, integration)
);

create index if not exists user_integrations_user_idx on public.user_integrations (user_id);

alter table public.user_integrations enable row level security;

drop policy if exists "user_integrations select own" on public.user_integrations;
create policy "user_integrations select own"
  on public.user_integrations for select
  using (auth.uid() = user_id);

drop policy if exists "user_integrations insert own" on public.user_integrations;
create policy "user_integrations insert own"
  on public.user_integrations for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_integrations update own" on public.user_integrations;
create policy "user_integrations update own"
  on public.user_integrations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_integrations delete own" on public.user_integrations;
create policy "user_integrations delete own"
  on public.user_integrations for delete
  using (auth.uid() = user_id);

drop trigger if exists user_integrations_set_updated_at on public.user_integrations;
create trigger user_integrations_set_updated_at
  before update on public.user_integrations
  for each row execute function public.set_updated_at();
