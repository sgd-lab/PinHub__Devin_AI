-- PinHub — Per-user custom task prompts
-- Lets each authenticated user store their own master prompt for each
-- generation task (single_pin / three_pins / guide / inspiration_pin).
-- Versioning: every save pushes the prior prompt_text into `history`.
-- Idempotent.

create table if not exists public.user_task_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null check (task in (
    'single_pin',
    'three_pins',
    'guide',
    'inspiration_pin'
  )),
  name text not null default 'Default',
  prompt_text text not null,
  version int not null default 1,
  history jsonb not null default '[]'::jsonb, -- [{version, prompt_text, saved_at}]
  is_default_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, task)
);

create index if not exists user_task_prompts_user_idx
  on public.user_task_prompts (user_id);

drop trigger if exists user_task_prompts_set_updated_at
  on public.user_task_prompts;
create trigger user_task_prompts_set_updated_at
  before update on public.user_task_prompts
  for each row execute function public.set_updated_at();

alter table public.user_task_prompts enable row level security;

drop policy if exists "user_task_prompts select own" on public.user_task_prompts;
create policy "user_task_prompts select own"
  on public.user_task_prompts for select
  using (auth.uid() = user_id);

drop policy if exists "user_task_prompts insert own" on public.user_task_prompts;
create policy "user_task_prompts insert own"
  on public.user_task_prompts for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_task_prompts update own" on public.user_task_prompts;
create policy "user_task_prompts update own"
  on public.user_task_prompts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_task_prompts delete own" on public.user_task_prompts;
create policy "user_task_prompts delete own"
  on public.user_task_prompts for delete
  using (auth.uid() = user_id);
