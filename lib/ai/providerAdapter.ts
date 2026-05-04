import { retrieveApiKey } from "@/lib/encryption/keyStore";
import { PROVIDER_DEFAULTS, PROVIDER_KEY_PATTERNS, PROVIDER_LABELS } from "@/stores/settingsStore";

export function getProviderConfig(providerName: string) {
  return PROVIDER_DEFAULTS[providerName] || {};
}

export function getApiKey(provider: string, passphrase: string): string | null {
  return retrieveApiKey(provider, passphrase);
}

/** Validate API key format before making any network call */
export function validateKeyFormat(provider: string, key: string): { valid: boolean; error?: string } {
  const pattern = PROVIDER_KEY_PATTERNS[provider];
  if (!pattern) return { valid: true };
  if (provider === "ollama") return { valid: true }; // Ollama has no key

  if (!key || key.trim().length < 8) {
    return { valid: false, error: "API key is too short. Please enter a valid key." };
  }

  if (!pattern.regex.test(key.trim())) {
    const label = PROVIDER_LABELS[provider] || provider;
    return {
      valid: false,
      error: `This doesn't look like a valid ${label} key. ${pattern.hint}`,
    };
  }

  return { valid: true };
}

/** Mask an API key for display: "sk-ant-abc123xyz" → "sk-a...3xyz" */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
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
      body: JSON.stringify({ baseUrl, apiKey, provider }),
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function fetchModels(
  baseUrl: string,
  apiKey: string,
  provider?: string
): Promise<string[]> {
  try {
    const response = await fetch("/api/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, apiKey, provider }),
    });
    const data = await response.json();
    return data.models || [];
  } catch {
    return [];
  }
}
