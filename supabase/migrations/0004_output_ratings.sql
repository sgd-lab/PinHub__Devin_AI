-- PinHub — Output Ratings (successful / weak / favorite)
-- Extends brand_memory.kind to allow `rated_output` so the contextual
-- prompt pipeline can reference the creator's past wins/losses.
-- Idempotent: safe to re-run.

-- ───────────────────────────── extend brand_memory.kind ─────────────────────────────
-- Drop the old check (added by 0001) and recreate it with the new value.
alter table public.brand_memory
  drop constraint if exists brand_memory_kind_check;

alter table public.brand_memory
  add constraint brand_memory_kind_check
  check (kind in (
    'tone',
    'favorite_style',
    'selected_output',
    'rejected_output',
    'hook_style',
    'keyword',
    'forbidden',
    'rated_output'
  ));

-- ───────────────────────────── helper index for rated_output lookups ─────────────────────────────
-- Speed up "fetch this user's recent rated outputs for niche X" without a
-- separate table. brand_memory.value is jsonb so we can index inside it.
create index if not exists brand_memory_rated_output_run_idx
  on public.brand_memory ((value ->> 'run_id'))
  where kind = 'rated_output';

create index if not exists brand_memory_rated_output_niche_idx
  on public.brand_memory ((value ->> 'niche'))
  where kind = 'rated_output';
