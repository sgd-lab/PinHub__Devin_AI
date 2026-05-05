"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const SETTINGS_STORE_VERSION = 4;

export type ProviderName =
  | "nvidia"
  | "openrouter"
  | "gemini"
  | "groq"
  | "anthropic"
  | "xai"
  | "deepseek"
  | "mistral"
  | "cohere"
  | "qwen"
  | "ollama"
  | "custom";

export interface ProviderConfig {
  name: ProviderName;
  base_url: string;
  api_key_ref: string;
  default_model: string;
  selected_model: string;
  available_models: string[];
  fallback_model?: string;
  max_tokens_default: number;
  temperature_default: number;
  top_p_default: number;
  enabled: boolean;
  validated: boolean;
}

interface NotionConfig {
  integration_token_ref: string;
  parent_page_id: string;
  database_id?: string;
  sync_mode: "immediate" | "manual" | "daily";
  daily_sync_time?: string;
  enabled: boolean;
  last_sync?: string;
}

interface SettingsState {
  providers: Record<string, ProviderConfig>;
  defaultProvider: string;
  defaultBrandId: string;
  defaultPromptPerGenerator: Record<string, string>;
  defaultExportFormat: "pdf" | "csv" | "json" | "markdown";
  defaultTimezone: string;
  defaultCountries: string[];
  defaultTemperature: number;
  notion: NotionConfig;
  budgetThreshold: number;
  qcFailureAlert: boolean;
  notionSyncFailureAlert: boolean;
  browserNotifications: boolean;
  reviewMode: boolean;
  encryptionEnabled: boolean;
  encryptionPassphrase: string;
  autoLockTimer: number;
  encryption: { passphrase_set: boolean; remember_device: boolean };
  alerts: Record<string, boolean>;
  featureFlags: {
    automation_enabled: boolean;
    experimental: boolean;
    debug_mode: boolean;
  };
  setProvider: (name: string, config: Partial<ProviderConfig>) => void;
  setProviderModels: (name: string, models: string[]) => void;
  setSelectedModel: (name: string, model: string) => void;
  setDefaultProvider: (provider: string) => void;
  setNotion: (config: Partial<NotionConfig>) => void;
  setReviewMode: (mode: boolean) => void;
  setEncryption: (config: Partial<{ passphrase_set: boolean; remember_device: boolean }>) => void;
  setFeatureFlag: (flag: keyof SettingsState["featureFlags"], value: boolean) => void;
  setBudgetThreshold: (threshold: number) => void;
  setAlerts: (alerts: Record<string, boolean>) => void;
}

export const PROVIDER_DEFAULTS: Record<string, Partial<ProviderConfig>> = {
  gemini: {
    name: "gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    default_model: "gemini-2.0-flash",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: true,
  },
  openrouter: {
    name: "openrouter",
    base_url: "https://openrouter.ai/api/v1",
    default_model: "meta-llama/llama-3.1-8b-instruct:free",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: true,
  },
  nvidia: {
    name: "nvidia",
    base_url: "https://integrate.api.nvidia.com/v1",
    default_model: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: false,
  },
  anthropic: {
    name: "anthropic",
    base_url: "https://api.anthropic.com/v1",
    default_model: "claude-3-5-sonnet-latest",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: false,
  },
  xai: {
    name: "xai",
    base_url: "https://api.x.ai/v1",
    default_model: "grok-3-mini-fast",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: false,
  },
  groq: {
    name: "groq",
    base_url: "https://api.groq.com/openai/v1",
    default_model: "llama-3.1-70b-versatile",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: false,
  },
  deepseek: {
    name: "deepseek",
    base_url: "https://api.deepseek.com/v1",
    default_model: "deepseek-chat",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: false,
  },
  mistral: {
    name: "mistral",
    base_url: "https://api.mistral.ai/v1",
    default_model: "mistral-small-latest",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: false,
  },
  cohere: {
    name: "cohere",
    base_url: "https://api.cohere.com/v2",
    default_model: "command-r-plus",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: false,
  },
  qwen: {
    name: "qwen",
    base_url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    default_model: "qwen-turbo",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: false,
  },
  ollama: {
    name: "ollama",
    base_url: "http://localhost:11434/v1",
    default_model: "llama3.1",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: false,
  },
};

/** Display labels for each provider */
export const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Gemini (Google)",
  openrouter: "OpenRouter",
  nvidia: "NVIDIA",
  anthropic: "Claude (Anthropic)",
  xai: "Grok (xAI)",
  groq: "Groq",
  deepseek: "DeepSeek",
  mistral: "Mistral AI",
  cohere: "Cohere",
  qwen: "Qwen (Alibaba)",
  ollama: "Ollama (Local)",
};

/** Regex patterns for API key format validation per provider */
export const PROVIDER_KEY_PATTERNS: Record<string, { regex: RegExp; hint: string }> = {
  anthropic: { regex: /^sk-ant-/, hint: "Claude keys start with 'sk-ant-...'" },
  gemini: { regex: /^AIza/, hint: "Gemini keys start with 'AIza...'" },
  openrouter: { regex: /^sk-or-/, hint: "OpenRouter keys start with 'sk-or-...'" },
  nvidia: { regex: /^nvapi-/, hint: "NVIDIA keys start with 'nvapi-...'" },
  xai: { regex: /^xai-/, hint: "Grok/xAI keys start with 'xai-...'" },
  deepseek: { regex: /^sk-/, hint: "DeepSeek keys start with 'sk-...'" },
  mistral: { regex: /^[a-zA-Z0-9]/, hint: "Enter your Mistral API key" },
  cohere: { regex: /^[a-zA-Z0-9]/, hint: "Enter your Cohere API key" },
  qwen: { regex: /^sk-/, hint: "Qwen/DashScope keys start with 'sk-...'" },
  groq: { regex: /^gsk_/, hint: "Groq keys start with 'gsk_...'" },
  ollama: { regex: /.*/, hint: "Ollama uses no key (local)" },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providers: Object.fromEntries(
        Object.entries(PROVIDER_DEFAULTS).map(([key, val]) => [
          key,
          { ...val, api_key_ref: "", selected_model: val.default_model || "", available_models: [], validated: false } as ProviderConfig,
        ])
      ),
      defaultProvider: "gemini",
      defaultBrandId: "",
      defaultPromptPerGenerator: {},
      defaultExportFormat: "pdf",
      defaultTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      defaultCountries: ["US", "CA", "UK"],
      defaultTemperature: 0.7,
      notion: {
        integration_token_ref: "",
        parent_page_id: "",
        sync_mode: "manual",
        enabled: false,
      },
      budgetThreshold: 80,
      qcFailureAlert: true,
      notionSyncFailureAlert: true,
      browserNotifications: false,
      reviewMode: false,
      encryptionEnabled: false,
      encryptionPassphrase: "",
      autoLockTimer: 30,
      encryption: { passphrase_set: false, remember_device: false },
      alerts: {
        budget_warning: true,
        qc_failure: true,
        sync_error: true,
        generation_complete: true,
        daily_summary: true,
      },
      featureFlags: {
        automation_enabled: false,
        experimental: false,
        debug_mode: false,
      },
      setProvider: (name, config) =>
        set((s) => ({
          providers: {
            ...s.providers,
            [name]: { ...s.providers[name], ...config },
          },
        })),
      setProviderModels: (name, models) =>
        set((s) => ({
          providers: {
            ...s.providers,
            [name]: { ...s.providers[name], available_models: models },
          },
        })),
      setSelectedModel: (name, model) =>
        set((s) => ({
          providers: {
            ...s.providers,
            [name]: { ...s.providers[name], selected_model: model },
          },
        })),
      setDefaultProvider: (provider) => set({ defaultProvider: provider }),
      setNotion: (config) =>
        set((s) => ({ notion: { ...s.notion, ...config } })),
      setReviewMode: (mode) => set({ reviewMode: mode }),
      setEncryption: (config) =>
        set((s) => ({
          encryption: { ...s.encryption, ...config },
        })),
      setFeatureFlag: (flag, value) =>
        set((s) => ({
          featureFlags: { ...s.featureFlags, [flag]: value },
        })),
      setBudgetThreshold: (threshold) => set({ budgetThreshold: threshold }),
      setAlerts: (alerts) =>
        set((s) => ({ alerts: { ...s.alerts, ...alerts } })),
    }),
    {
      name: "pinhub-settings-store",
      version: SETTINGS_STORE_VERSION,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        const providers = (state.providers as Record<string, ProviderConfig>) || {};

        // v0/v1 → v2: update stale model names and base URLs
        if (version < 2) {
          for (const [key, defaults] of Object.entries(PROVIDER_DEFAULTS)) {
            if (providers[key]) {
              providers[key].default_model = defaults.default_model as string;
              providers[key].base_url = defaults.base_url as string;
            }
          }
        }

        // v2 → v3: add selected_model, available_models, validated fields
        if (version < 3) {
          for (const key of Object.keys(providers)) {
            if (!providers[key].selected_model) {
              providers[key].selected_model = providers[key].default_model;
            }
            if (!providers[key].available_models) {
              providers[key].available_models = [];
            }
            if (providers[key].validated === undefined) {
              providers[key].validated = !!providers[key].api_key_ref;
            }
          }
        }

        // v3 → v4: add new providers, fix Anthropic model ID
        if (version < 4) {
          // Fix Anthropic model ID (was "claude-3.5-sonnet", must be "claude-3-5-sonnet-latest")
          if (providers.anthropic) {
            providers.anthropic.default_model = "claude-3-5-sonnet-latest";
            if (providers.anthropic.selected_model === "claude-3.5-sonnet") {
              providers.anthropic.selected_model = "claude-3-5-sonnet-latest";
            }
          }
          // Add new providers if they don't exist
          for (const [key, defaults] of Object.entries(PROVIDER_DEFAULTS)) {
            if (!providers[key]) {
              providers[key] = {
                ...defaults,
                api_key_ref: "",
                selected_model: defaults.default_model || "",
                available_models: [],
                validated: false,
              } as ProviderConfig;
            }
          }
        }

        state.providers = providers;
        return state as unknown as SettingsState;
      },
    }
  )
);
