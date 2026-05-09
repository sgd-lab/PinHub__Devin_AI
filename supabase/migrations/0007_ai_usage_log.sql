-- PinHub — Server-side AI usage log
-- One row per completed generation / chat response, written by /api/ai/chat
-- after the stream finishes. Powers the right-side usage widget so the user
-- can see real tokens used + cost across providers.
-- RLS scoped to auth.uid(). Idempotent.

create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer generated always as (input_tokens + output_tokens) stored,
  cost_estimate numeric(12, 6) not null default 0,
  attempt text not null default 'primary' check (attempt in ('primary', 'fallback')),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_log_user_created_idx
  on public.ai_usage_log (user_id, created_at desc);

create index if not exists ai_usage_log_user_provider_idx
  on public.ai_usage_log (user_id, provider);

alter table public.ai_usage_log enable row level security;

drop policy if exists "ai_usage_log select own" on public.ai_usage_log;
create policy "ai_usage_log select own"
  on public.ai_usage_log for select
  using (auth.uid() = user_id);

drop policy if exists "ai_usage_log insert own" on public.ai_usage_log;
create policy "ai_usage_log insert own"
  on public.ai_usage_log for insert
  with check (auth.uid() = user_id);

-- (no update / delete policy — usage rows are append-only)
