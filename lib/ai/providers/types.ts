export type ProviderId =
  | "openrouter"
  | "gemini"
  | "grok"
  | "nvidia"
  | "github_models"
  | "groq"
  | "cerebras"
  | "cloudflare"
  | "llm7"
  | "kluster"
  | "huggingface"
  | "cohere"
  | "mistral"
  | "zhipu";

export const PROVIDER_IDS: ProviderId[] = [
  "openrouter",
  "gemini",
  "grok",
  "nvidia",
  "github_models",
  "groq",
  "cerebras",
  "cloudflare",
  "llm7",
  "kluster",
  "huggingface",
  "cohere",
  "mistral",
  "zhipu",
];

/**
 * Extra parameters that some providers need alongside the API key.
 * Stored on `user_api_keys.metadata` (jsonb).
 */
export interface ProviderMetadataField {
  /** Field id stored under `metadata[key]`. */
  key: string;
  /** UI label shown in Settings → API Keys. */
  label: string;
  /** UI placeholder. */
  placeholder?: string;
  /** Short helper text below the field. */
  hint?: string;
  /** When true, the field is required to save the key. */
  required: boolean;
}

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  /**
   * Base URL for the OpenAI-compatible endpoint. May contain a
   * `{account_id}` placeholder which is substituted at request time
   * from `metadata.account_id` (Cloudflare).
   */
  base_url: string;
  /** Where the user gets a key. */
  signup_url: string;
  /** Default model if the user hasn't picked one yet. */
  fallback_default_model: string;
  /** When true, /models needs the GET /models endpoint with extra parsing. */
  uses_openai_models_endpoint: boolean;
  /** Free tier / rate limit hint shown next to the provider in Settings. */
  free_tier_hint?: string;
  /**
   * Extra static headers (besides Authorization + Content-Type). Used by
   * providers like OpenRouter that want a referrer header.
   */
  extra_headers_static?: Record<string, string>;
  /**
   * Extra fields the user must supply alongside their API key. Stored on
   * `user_api_keys.metadata`. Used by Cloudflare for `account_id`.
   */
  metadata_fields?: ProviderMetadataField[];
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  // ─── existing providers ───────────────────────────────────────────────────
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    base_url: "https://openrouter.ai/api/v1",
    signup_url: "https://openrouter.ai/keys",
    fallback_default_model: "openai/gpt-4o-mini",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Hundreds of models, paid + free routes",
    extra_headers_static: {
      "HTTP-Referer": "https://pinhub.app",
      "X-Title": "PinHub",
    },
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    signup_url: "https://aistudio.google.com/apikey",
    fallback_default_model: "gemini-2.5-flash",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Free tier: 10 RPM, 250 RPD on Flash",
  },
  grok: {
    id: "grok",
    label: "xAI Grok",
    base_url: "https://api.x.ai/v1",
    signup_url: "https://console.x.ai",
    fallback_default_model: "grok-2-latest",
    uses_openai_models_endpoint: true,
  },
  nvidia: {
    id: "nvidia",
    label: "NVIDIA NIM",
    base_url: "https://integrate.api.nvidia.com/v1",
    signup_url: "https://build.nvidia.com",
    fallback_default_model: "meta/llama-3.1-70b-instruct",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Free credits with NVIDIA developer account",
  },

  // ─── expanded providers ───────────────────────────────────────────────────
  github_models: {
    id: "github_models",
    label: "GitHub Models",
    base_url: "https://models.inference.ai.azure.com",
    signup_url: "https://github.com/marketplace/models",
    fallback_default_model: "gpt-4.1-mini",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Free for prototyping with a GitHub PAT (8K in / 4K out)",
  },
  groq: {
    id: "groq",
    label: "Groq",
    base_url: "https://api.groq.com/openai/v1",
    signup_url: "https://console.groq.com/keys",
    fallback_default_model: "llama-3.3-70b-versatile",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Free tier: 30 RPM, 14,400 RPD on most models",
  },
  cerebras: {
    id: "cerebras",
    label: "Cerebras",
    base_url: "https://api.cerebras.ai/v1",
    signup_url: "https://cloud.cerebras.ai/",
    fallback_default_model: "llama3.1-8b",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Free: ~2,600 tok/s, 1M tokens/day",
  },
  cloudflare: {
    id: "cloudflare",
    label: "Cloudflare Workers AI",
    base_url:
      "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1",
    signup_url: "https://dash.cloudflare.com/profile/api-tokens",
    fallback_default_model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Free: 10,000 Neurons/day across 50+ models",
    metadata_fields: [
      {
        key: "account_id",
        label: "Cloudflare Account ID",
        placeholder: "32-character hex from your Cloudflare dashboard",
        hint: "Found in dash.cloudflare.com → right sidebar → Account ID",
        required: true,
      },
    ],
  },
  llm7: {
    id: "llm7",
    label: "LLM7.io",
    base_url: "https://api.llm7.io/v1",
    signup_url: "https://token.llm7.io",
    fallback_default_model: "gpt-4o-mini",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Zero-friction gateway: 30+ models, 30–120 RPM",
  },
  kluster: {
    id: "kluster",
    label: "Kluster AI",
    base_url: "https://api.kluster.ai/v1",
    signup_url: "https://www.kluster.ai/",
    fallback_default_model: "klusterai/Meta-Llama-3.3-70B-Instruct-Turbo",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Free credits with sign-up",
  },
  huggingface: {
    id: "huggingface",
    label: "Hugging Face",
    base_url: "https://router.huggingface.co/v1",
    signup_url: "https://huggingface.co/settings/tokens",
    fallback_default_model: "meta-llama/Llama-3.1-8B-Instruct",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Serverless Inference + ~$0.10/month free credits",
  },
  cohere: {
    id: "cohere",
    label: "Cohere",
    base_url: "https://api.cohere.com/compatibility/v1",
    signup_url: "https://dashboard.cohere.com/api-keys",
    fallback_default_model: "command-r-plus",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Free trial: 1,000 calls/month (non-commercial)",
  },
  mistral: {
    id: "mistral",
    label: "Mistral AI",
    base_url: "https://api.mistral.ai/v1",
    signup_url: "https://console.mistral.ai/api-keys",
    fallback_default_model: "mistral-small-latest",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Free \"Experiment\" plan, ~1B tokens/month",
  },
  zhipu: {
    id: "zhipu",
    label: "Zhipu AI (Z AI)",
    base_url: "https://open.bigmodel.cn/api/paas/v4",
    signup_url: "https://open.bigmodel.cn/usercenter/apikeys",
    fallback_default_model: "glm-4.5-flash",
    uses_openai_models_endpoint: true,
    free_tier_hint: "Permanent free GLM-Flash models",
  },
};

export function isProviderId(s: unknown): s is ProviderId {
  return typeof s === "string" && (PROVIDER_IDS as string[]).includes(s);
}

/**
 * Resolve a provider's effective base URL given user-supplied metadata
 * (currently used to substitute `{account_id}` for Cloudflare).
 */
export function resolveProviderBaseUrl(
  provider: ProviderInfo,
  metadata: Record<string, unknown> | null | undefined
): string {
  let url = provider.base_url;
  if (url.includes("{account_id}")) {
    const accountId =
      typeof metadata?.account_id === "string"
        ? (metadata.account_id as string).trim()
        : "";
    if (!accountId) {
      // Fall back to a placeholder that will fail with a clear 4xx — better
      // than a silent network error.
      url = url.replace("{account_id}", "MISSING_ACCOUNT_ID");
    } else {
      url = url.replace("{account_id}", accountId);
    }
  }
  return url;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  context_length?: number;
}

export type ChatChunk =
  | { type: "token"; token: string }
  | {
      type: "usage";
      usage: { input_tokens: number; output_tokens: number };
    }
  | { type: "error"; message: string; code?: string }
  | { type: "done" };

export type AITaskKind = "pin" | "guide" | "inspiration" | "chat";
