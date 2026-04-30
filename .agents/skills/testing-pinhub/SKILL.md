# Testing PinHub (Atelier Workspace)

## Overview
PinHub is a Next.js 14 app with Zustand state management (persisted to localStorage) and Supabase backend. Testing requires proper localStorage initialization since the app enforces onboarding completion and API key gating.

## Local Dev Setup
```bash
cd /home/ubuntu/pinhub
pnpm install
pnpm dev  # starts on port 3000
```
Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Bypassing Onboarding
The app requires onboarding completion before showing dashboard/generator pages. To skip onboarding in testing, set the `pinhub-ui-store` localStorage key with correct Zustand persist format:

```javascript
localStorage.setItem('pinhub-ui-store', JSON.stringify({
  state: {
    sidebarCollapsed: false,
    costMeterVisible: true,
    commandPaletteOpen: false,
    theme: "warm-ivory",
    fontSize: "md",
    density: "comfortable",
    libraryDefaultView: "grid",
    streamingAnimation: true,
    commandUsage: {},
    onboardingComplete: true,
    onboardingStep: 4,
    onboardingChecklist: {
      loadBrandDefaults: true,
      addApiKeys: false,
      generateFirstPin: false,
      connectNotion: false,
      generateFirstGuide: false
    }
  },
  version: 0
}));
```

**Important**: The key name is `pinhub-ui-store` (NOT `pinhub-onboarding`). Using the wrong key will result in pages rendering empty.

## Key Pages for Testing

### Settings → API Keys (`/settings/api-keys`)
- Shows all 6 AI providers with their default model names
- Model names come from `PROVIDER_DEFAULTS` in `stores/settingsStore.ts`
- Each provider card displays: provider name, FREE TIER badge (if applicable), API key input, Save & Test button, model name
- Provider order is defined by `PROVIDER_ORDER` array (line 20): Gemini → OpenRouter → Nvidia → Groq → Anthropic → Ollama
- This page always renders correctly and is the best place to verify provider configuration changes

### Dashboard (`/dashboard`)
- May render with empty `<main>` if Supabase tables don't exist or RLS blocks anonymous queries
- The dashboard component fetches from Supabase (`getRecentRuns`, `getTodayCost`) on mount
- If Supabase is not properly configured, the component might silently fail to render
- Shows API Keys Status section with NVIDIA, OpenRouter, and Gemini indicators (lines 138-157)

### Generator Pages (`/generate/single`, `/generate/daily`, `/generate/guide`, `/generate/mega`)
- All generator pages use `useApiKeyGate` hook which redirects to `/settings/api-keys` if no API key is stored
- To test generators, you need a real AI provider API key stored via the Settings page
- Without API keys, these pages will immediately redirect — this is expected behavior

## API Key Gating
- The `useApiKeyGate` hook (in `lib/hooks/useApiKeyGate.ts`) checks if any provider has a stored API key
- Keys are AES-256 encrypted and stored in browser localStorage via `lib/encryption/keyStore.ts`
- The passphrase is hardcoded as `"pinhub-default-key"`
- Generator and research pages are gated; dashboard and settings are not

## Provider Model Verification
To verify provider default models are correct:
1. Clear localStorage completely
2. Set `pinhub-ui-store` with onboarding completed (see above)
3. Navigate to `/settings/api-keys`
4. Check `Model: <name>` text below each provider's API key input
5. Model names come directly from `PROVIDER_DEFAULTS` object in `stores/settingsStore.ts`

Current expected models (as of PR #5):
- Gemini: `gemini-2.0-flash`
- OpenRouter: `meta-llama/llama-3.1-8b-instruct:free`
- Nvidia: `nvidia/llama-3.1-nemotron-ultra-253b-v1`
- Groq: `llama-3.1-70b-versatile`
- Anthropic: `claude-3.5-sonnet`
- Ollama: `llama3.1`

**Note**: These model names might change as providers deprecate/update models. If tests fail with 404 errors on generation, check if the model names are still valid on the respective provider's documentation.

## Known Issues
- **Dashboard empty rendering**: The dashboard `<main>` may render empty if Supabase is not properly configured or if RLS policies block anonymous queries. This is a Supabase data dependency issue, not a frontend bug.
- **Root page (`/`) 404**: The root page may show 404 due to Zustand persist hydration timing. Navigate directly to `/onboarding` or `/dashboard` instead.
- **CSS might not load on first visit**: The Next.js dev server compiles pages on first visit. Wait 10-20 seconds for compilation, then the page will render with full CSS.

## Devin Secrets Needed
- `VERCEL_TOKEN` — For deploying to Vercel (optional, only needed for deployment testing)
- AI provider API keys (Gemini, OpenRouter, etc.) — For end-to-end generation testing. Without these, only UI verification is possible.
