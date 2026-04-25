import { retrieveApiKey } from "@/lib/encryption/keyStore";
import { PROVIDER_DEFAULTS } from "@/stores/settingsStore";

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

export function getProviderConfig(providerName: string): Partial<ProviderConfig> {
  return PROVIDER_DEFAULTS[providerName] || {};
}

export function getApiKey(provider: string, passphrase: string): string | null {
  return retrieveApiKey(provider, passphrase);
}

export async function testProviderConnection(
  provider: string,
  apiKey: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string; models?: string[] }> {
  try {
    const response = await fetch("/api/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, apiKey }),
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function fetchModels(
  baseUrl: string,
  apiKey: string
): Promise<string[]> {
  try {
    const response = await fetch("/api/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, apiKey }),
    });
    const data = await response.json();
    return data.models || [];
  } catch {
    return [];
  }
}
