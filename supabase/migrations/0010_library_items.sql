-- PinHub — Library items
-- Per-user saved generation outputs created from "Save to Library".
-- Stores parsed pin payloads keyed to the originating run.

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id text,
  run_type text,
  pin_index integer,
  title text not null,
  description text,
  visual_prompt text,
  thumbnail_url text,
  is_favorite boolean not null default false,
  tags text[] not null default '{}'::text[],
  payload jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_items_user_idx on public.library_items (user_id, saved_at desc);
create index if not exists library_items_run_idx on public.library_items (user_id, run_id);
create index if not exists library_items_favorite_idx on public.library_items (user_id, is_favorite) where is_favorite = true;

alter table public.library_items enable row level security;

drop policy if exists "library_items select own" on public.library_items;
create policy "library_items select own"
  on public.library_items for select
  using (auth.uid() = user_id);

drop policy if exists "library_items insert own" on public.library_items;
create policy "library_items insert own"
  on public.library_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "library_items update own" on public.library_items;
create policy "library_items update own"
  on public.library_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "library_items delete own" on public.library_items;
create policy "library_items delete own"
  on public.library_items for delete
  using (auth.uid() = user_id);

drop trigger if exists library_items_set_updated_at on public.library_items;
create trigger library_items_set_updated_at
  before update on public.library_items
  for each row execute function public.set_updated_at();
