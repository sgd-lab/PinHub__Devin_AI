-- PinHub — Provider registry expansion
-- Relaxes the hardcoded `provider` check on the AI provider tables so the
-- expanded registry (github_models, groq, cerebras, cloudflare, llm7,
-- kluster, huggingface, cohere, mistral, zhipu, plus the existing four)
-- can be stored. We swap the strict CHECK enum for an open text column
-- validated server-side via lib/ai/providers/types.ts.
-- Also adds `metadata jsonb` on user_api_keys to support providers that
-- need extra parameters next to the API key (e.g. Cloudflare account_id).
-- Idempotent.

-- ───────────────────────────── user_api_keys ─────────────────────────────
alter table public.user_api_keys
  drop constraint if exists user_api_keys_provider_check;

alter table public.user_api_keys
  add constraint user_api_keys_provider_check
  check (provider in (
    -- existing
    'openrouter', 'gemini', 'grok', 'nvidia',
    -- expanded
    'github_models', 'groq', 'cerebras', 'cloudflare', 'llm7',
    'kluster', 'huggingface', 'cohere', 'mistral', 'zhipu'
  ));

alter table public.user_api_keys
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- ───────────────────────────── ai_provider_settings ─────────────────────────────
alter table public.ai_provider_settings
  drop constraint if exists ai_provider_settings_provider_check;

alter table public.ai_provider_settings
  add constraint ai_provider_settings_provider_check
  check (provider in (
    'openrouter', 'gemini', 'grok', 'nvidia',
    'github_models', 'groq', 'cerebras', 'cloudflare', 'llm7',
    'kluster', 'huggingface', 'cohere', 'mistral', 'zhipu'
  ));

-- ───────────────────────────── user_model_preferences ─────────────────────────────
alter table public.user_model_preferences
  drop constraint if exists user_model_preferences_provider_check;

alter table public.user_model_preferences
  add constraint user_model_preferences_provider_check
  check (provider in (
    'openrouter', 'gemini', 'grok', 'nvidia',
    'github_models', 'groq', 'cerebras', 'cloudflare', 'llm7',
    'kluster', 'huggingface', 'cohere', 'mistral', 'zhipu'
  ));

alter table public.user_model_preferences
  drop constraint if exists user_model_preferences_fallback_provider_check;

alter table public.user_model_preferences
  add constraint user_model_preferences_fallback_provider_check
  check (
    fallback_provider is null
    or fallback_provider in (
      'openrouter', 'gemini', 'grok', 'nvidia',
      'github_models', 'groq', 'cerebras', 'cloudflare', 'llm7',
      'kluster', 'huggingface', 'cohere', 'mistral', 'zhipu'
    )
  );
