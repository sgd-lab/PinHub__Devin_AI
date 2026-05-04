import { PROVIDER_LABELS } from "@/stores/settingsStore";

export interface AIErrorInfo {
  message: string;
  provider: string;
  statusCode?: number;
  errorType: "auth" | "rate_limit" | "quota" | "model" | "network" | "server" | "unknown";
  suggestion: string;
  fixPath?: string;
}

const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  type: AIErrorInfo["errorType"];
  suggestion: string;
}> = [
  { pattern: /API key not valid|invalid.*api.*key/i, type: "auth", suggestion: "Your API key is invalid or expired. Please update it in Settings → API Keys." },
  { pattern: /401|unauthorized|authentication/i, type: "auth", suggestion: "Your stored API key for this provider is invalid or expired. Please update it in API Keys." },
  { pattern: /403|forbidden|access.*denied/i, type: "auth", suggestion: "Access denied. Check your API key permissions in Settings → API Keys." },
  { pattern: /429|rate.*limit|too many requests/i, type: "rate_limit", suggestion: "Rate limit exceeded. Wait a moment and try again, or switch to a different provider." },
  { pattern: /quota.*exceeded|billing|insufficient.*funds|insufficient.*credit/i, type: "quota", suggestion: "API quota exceeded. Check your plan limits or switch to a free provider like Gemini." },
  { pattern: /No endpoints found/i, type: "model", suggestion: "The model is not available on this provider. Go to Settings → API Keys and select a different model." },
  { pattern: /context.*length|token.*limit|too.*long|max.*token.*exceeded|context.*exceeded/i, type: "model", suggestion: "The request exceeded the model's token limit. Try reducing your prompt length or max tokens setting." },
  { pattern: /model.*not.*found|invalid.*model|does not exist/i, type: "model", suggestion: "The selected model is not available. Go to Settings → API Keys and select a different model." },
  { pattern: /fetch|network|ECONNREFUSED|ENOTFOUND|timeout|DNS/i, type: "network", suggestion: "Network error. Check your internet connection or verify the provider URL." },
  { pattern: /500|502|503|504|internal.*server/i, type: "server", suggestion: "The AI provider is experiencing issues. Try again later or switch providers." },
];

export function parseAIError(error: unknown, provider: string): AIErrorInfo {
  const message = error instanceof Error ? error.message : String(error);
  const label = PROVIDER_LABELS[provider] || provider;

  const statusMatch = message.match(/\b(\d{3})\b/);
  const statusCode = statusMatch ? parseInt(statusMatch[1]) : undefined;

  for (const { pattern, type, suggestion } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      // For auth/quota errors, add provider-specific messaging with deep-link
      const providerSuggestion = (type === "auth" || type === "quota")
        ? suggestion.replace("this provider", label)
        : suggestion;
      return {
        message,
        provider,
        statusCode,
        errorType: type,
        suggestion: providerSuggestion,
        fixPath: type === "auth" || type === "quota" || type === "model" ? "/settings/api-keys" : undefined,
      };
    }
  }

  return {
    message,
    provider,
    statusCode,
    errorType: "unknown",
    suggestion: `An unexpected error occurred with ${label}. Try again or check Settings → API Keys.`,
    fixPath: "/settings/api-keys",
  };
}

export function getErrorTitle(type: AIErrorInfo["errorType"]): string {
  switch (type) {
    case "auth": return "Authentication Failed";
    case "rate_limit": return "Rate Limit Exceeded";
    case "quota": return "Quota Exceeded";
    case "model": return "Model Not Available";
    case "network": return "Connection Failed";
    case "server": return "Provider Error";
    default: return "Generation Failed";
  }
}
