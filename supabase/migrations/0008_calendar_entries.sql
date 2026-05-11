-- PinHub — Calendar entries
-- Per-user scheduled content items created from "Add All to Calendar".
-- RLS-scoped to auth.uid(). Idempotent.

create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id text,
  run_type text,
  pin_index integer,
  scheduled_for date not null,
  scheduled_time time,
  content_type text not null default 'pin',
  status text not null default 'scheduled' check (status in ('scheduled', 'in_review', 'published', 'cancelled')),
  title text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_entries_user_idx on public.calendar_entries (user_id, scheduled_for desc);
create index if not exists calendar_entries_run_idx on public.calendar_entries (user_id, run_id);

alter table public.calendar_entries enable row level security;

drop policy if exists "calendar_entries select own" on public.calendar_entries;
create policy "calendar_entries select own"
  on public.calendar_entries for select
  using (auth.uid() = user_id);

drop policy if exists "calendar_entries insert own" on public.calendar_entries;
create policy "calendar_entries insert own"
  on public.calendar_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "calendar_entries update own" on public.calendar_entries;
create policy "calendar_entries update own"
  on public.calendar_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "calendar_entries delete own" on public.calendar_entries;
create policy "calendar_entries delete own"
  on public.calendar_entries for delete
  using (auth.uid() = user_id);

drop trigger if exists calendar_entries_set_updated_at on public.calendar_entries;
create trigger calendar_entries_set_updated_at
  before update on public.calendar_entries
  for each row execute function public.set_updated_at();
