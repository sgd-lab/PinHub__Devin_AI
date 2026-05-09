import "server-only";

import type { ProviderId } from "./providers/types";

/**
 * Per-provider price hints (USD per 1K input tokens, USD per 1K output tokens).
 * These are coarse — providers differ wildly by model and these constants are
 * only used to compute a "usage estimate" for the right-side widget.
 *
 * For free-tier providers we use 0 by design.
 *
 * If a provider/model isn't here, we fall back to a tiny generic estimate so
 * the widget still moves rather than showing $0 for everything.
 */
const PROVIDER_PRICE_HINTS: Record<
  ProviderId,
  { input_per_1k: number; output_per_1k: number }
> = {
  openrouter: { input_per_1k: 0.0005, output_per_1k: 0.0015 },
  gemini: { input_per_1k: 0.000075, output_per_1k: 0.0003 },
  grok: { input_per_1k: 0.005, output_per_1k: 0.015 },
  nvidia: { input_per_1k: 0, output_per_1k: 0 },
  github_models: { input_per_1k: 0, output_per_1k: 0 },
  groq: { input_per_1k: 0.00059, output_per_1k: 0.00079 },
  cerebras: { input_per_1k: 0, output_per_1k: 0 },
  cloudflare: { input_per_1k: 0, output_per_1k: 0 },
  llm7: { input_per_1k: 0, output_per_1k: 0 },
  kluster: { input_per_1k: 0.00029, output_per_1k: 0.00079 },
  huggingface: { input_per_1k: 0, output_per_1k: 0 },
  cohere: { input_per_1k: 0.0005, output_per_1k: 0.0015 },
  mistral: { input_per_1k: 0.0002, output_per_1k: 0.0006 },
  zhipu: { input_per_1k: 0.0001, output_per_1k: 0.0003 },
};

const FALLBACK_PRICE = { input_per_1k: 0.0005, output_per_1k: 0.0015 };

export function estimateProviderCost(
  provider: ProviderId,
  // model is reserved for future per-model overrides; intentionally unused.
  _model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const price = PROVIDER_PRICE_HINTS[provider] ?? FALLBACK_PRICE;
  const cost =
    (inputTokens / 1000) * price.input_per_1k +
    (outputTokens / 1000) * price.output_per_1k;
  return Number.isFinite(cost) ? Number(cost.toFixed(6)) : 0;
}

/** Indicates whether the provider has any non-zero price hint. */
export function isPaidProvider(provider: ProviderId): boolean {
  const price = PROVIDER_PRICE_HINTS[provider];
  if (!price) return false;
  return price.input_per_1k > 0 || price.output_per_1k > 0;
}
