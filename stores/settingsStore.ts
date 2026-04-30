"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const SETTINGS_STORE_VERSION = 2;

export interface ProviderConfig {
  name: "nvidia" | "openrouter" | "gemini" | "groq" | "anthropic" | "ollama" | "custom";
  base_url: string;
  api_key_ref: string;
  default_model: string;
  fallback_model?: string;
  max_tokens_default: number;
  temperature_default: number;
  top_p_default: number;
  enabled: boolean;
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
  setDefaultProvider: (provider: string) => void;
  setNotion: (config: Partial<NotionConfig>) => void;
  setReviewMode: (mode: boolean) => void;
  setEncryption: (config: Partial<{ passphrase_set: boolean; remember_device: boolean }>) => void;
  setFeatureFlag: (flag: keyof SettingsState["featureFlags"], value: boolean) => void;
  setBudgetThreshold: (threshold: number) => void;
  setAlerts: (alerts: Record<string, boolean>) => void;
}

export const PROVIDER_DEFAULTS: Record<string, Partial<ProviderConfig>> = {
  nvidia: {
    name: "nvidia",
    base_url: "https://integrate.api.nvidia.com/v1",
    default_model: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
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
  gemini: {
    name: "gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    default_model: "gemini-2.0-flash",
    max_tokens_default: 2000,
    temperature_default: 0.7,
    top_p_default: 0.9,
    enabled: true,
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
  anthropic: {
    name: "anthropic",
    base_url: "https://api.anthropic.com/v1",
    default_model: "claude-3.5-sonnet",
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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providers: Object.fromEntries(
        Object.entries(PROVIDER_DEFAULTS).map(([key, val]) => [
          key,
          { ...val, api_key_ref: "" } as ProviderConfig,
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
        if (version < 2) {
          const providers = state.providers as Record<string, ProviderConfig> | undefined;
          if (providers) {
            for (const [key, defaults] of Object.entries(PROVIDER_DEFAULTS)) {
              if (providers[key]) {
                providers[key].default_model = defaults.default_model as string;
                providers[key].base_url = defaults.base_url as string;
              }
            }
            state.providers = providers;
          }
        }
        return state as unknown as SettingsState;
      },
    }
  )
);
