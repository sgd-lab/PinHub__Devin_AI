-- PinHub — AI Creative Assistant Schema
-- Persistent chat sessions, messages, and creator-intelligence memory events.
-- Idempotent: safe to re-run. Depends on 0001_user_personalization.sql for set_updated_at().

-- ───────────────────────────── ai_chat_sessions ─────────────────────────────
create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  -- Active provider/model for this session. Pinned per-session so conversation
  -- continuity is preserved even if the user changes default task assignments.
  provider text,
  model text,
  -- Last assistant error code, if any, for "show retry banner" affordances.
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists ai_chat_sessions_user_idx
  on public.ai_chat_sessions (user_id, last_message_at desc);

-- ───────────────────────────── ai_chat_messages ─────────────────────────────
create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  -- Provider/model that produced this message (assistant role only).
  provider text,
  model text,
  tokens_in integer,
  tokens_out integer,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_messages_session_idx
  on public.ai_chat_messages (session_id, created_at);

create index if not exists ai_chat_messages_user_idx
  on public.ai_chat_messages (user_id, created_at desc);

-- ───────────────────────────── ai_memory_events ─────────────────────────────
-- Lightweight long-term memory: accepted/rejected suggestions, recurring goals,
-- preferred emotional tones, favorite generation styles. Used by the assistant
-- to ground its responses in actual creator behavior.
create table if not exists public.ai_memory_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'accepted_suggestion',
    'rejected_suggestion',
    'favorite_style',
    'creator_goal',
    'preferred_tone'
  )),
  payload jsonb not null,
  source_session_id uuid references public.ai_chat_sessions(id) on delete set null,
  source_message_id uuid references public.ai_chat_messages(id) on delete set null,
  weight real not null default 1.0,
  created_at timestamptz not null default now()
);

create index if not exists ai_memory_events_user_kind_idx
  on public.ai_memory_events (user_id, kind, created_at desc);

create index if not exists ai_memory_events_user_recent_idx
  on public.ai_memory_events (user_id, created_at desc);

-- ───────────────────────────── updated_at trigger ─────────────────────────────
drop trigger if exists ai_chat_sessions_set_updated_at on public.ai_chat_sessions;
create trigger ai_chat_sessions_set_updated_at
  before update on public.ai_chat_sessions
  for each row execute function public.set_updated_at();

-- Bump session.last_message_at when a new message is inserted.
create or replace function public.bump_session_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update public.ai_chat_sessions
    set last_message_at = new.created_at,
        updated_at = now()
    where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists ai_chat_messages_bump_session on public.ai_chat_messages;
create trigger ai_chat_messages_bump_session
  after insert on public.ai_chat_messages
  for each row execute function public.bump_session_last_message_at();

-- ───────────────────────────── RLS ─────────────────────────────
alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;
alter table public.ai_memory_events enable row level security;

-- ai_chat_sessions
drop policy if exists "ai_chat_sessions select own" on public.ai_chat_sessions;
create policy "ai_chat_sessions select own"
  on public.ai_chat_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "ai_chat_sessions insert own" on public.ai_chat_sessions;
create policy "ai_chat_sessions insert own"
  on public.ai_chat_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "ai_chat_sessions update own" on public.ai_chat_sessions;
create policy "ai_chat_sessions update own"
  on public.ai_chat_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ai_chat_sessions delete own" on public.ai_chat_sessions;
create policy "ai_chat_sessions delete own"
  on public.ai_chat_sessions for delete
  using (auth.uid() = user_id);

-- ai_chat_messages
drop policy if exists "ai_chat_messages select own" on public.ai_chat_messages;
create policy "ai_chat_messages select own"
  on public.ai_chat_messages for select
  using (auth.uid() = user_id);

drop policy if exists "ai_chat_messages insert own" on public.ai_chat_messages;
create policy "ai_chat_messages insert own"
  on public.ai_chat_messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "ai_chat_messages update own" on public.ai_chat_messages;
create policy "ai_chat_messages update own"
  on public.ai_chat_messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ai_chat_messages delete own" on public.ai_chat_messages;
create policy "ai_chat_messages delete own"
  on public.ai_chat_messages for delete
  using (auth.uid() = user_id);

-- ai_memory_events
drop policy if exists "ai_memory_events select own" on public.ai_memory_events;
create policy "ai_memory_events select own"
  on public.ai_memory_events for select
  using (auth.uid() = user_id);

drop policy if exists "ai_memory_events insert own" on public.ai_memory_events;
create policy "ai_memory_events insert own"
  on public.ai_memory_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "ai_memory_events update own" on public.ai_memory_events;
create policy "ai_memory_events update own"
  on public.ai_memory_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ai_memory_events delete own" on public.ai_memory_events;
create policy "ai_memory_events delete own"
  on public.ai_memory_events for delete
  using (auth.uid() = user_id);
