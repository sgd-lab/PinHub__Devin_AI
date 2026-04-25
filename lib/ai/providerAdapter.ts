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
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const data = await response.json();
    const models = data.data?.map((m: { id: string }) => m.id) || [];
    return { success: true, models };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function fetchModels(
  baseUrl: string,
  apiKey: string
): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data?.map((m: { id: string }) => m.id) || [];
  } catch {
    return [];
  }
}
