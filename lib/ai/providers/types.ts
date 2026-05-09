export type ProviderId = "openrouter" | "gemini" | "grok" | "nvidia";

export const PROVIDER_IDS: ProviderId[] = [
  "openrouter",
  "gemini",
  "grok",
  "nvidia",
];

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  base_url: string;
  /** Where the user gets a key. */
  signup_url: string;
  /** Default model if the user hasn't picked one yet. */
  fallback_default_model: string;
  /** When true, /models needs the GET /models endpoint with extra parsing. */
  uses_openai_models_endpoint: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    base_url: "https://openrouter.ai/api/v1",
    signup_url: "https://openrouter.ai/keys",
    fallback_default_model: "openai/gpt-4o-mini",
    uses_openai_models_endpoint: true,
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    signup_url: "https://aistudio.google.com/apikey",
    fallback_default_model: "gemini-1.5-flash",
    uses_openai_models_endpoint: true,
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
  },
};

export function isProviderId(s: unknown): s is ProviderId {
  return typeof s === "string" && (PROVIDER_IDS as string[]).includes(s);
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
