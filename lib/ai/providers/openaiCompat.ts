import "server-only";

import type {
  ChatChunk,
  ChatMessage,
  ModelInfo,
  ProviderInfo,
} from "./types";

export interface ValidateResult {
  ok: boolean;
  status?: number;
  error?: string;
  models?: ModelInfo[];
}

export interface ChatStreamArgs {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  topP?: number;
  signal?: AbortSignal;
  /** Provider-specific extras (e.g. Cloudflare account_id). */
  metadata?: Record<string, unknown> | null;
}

/**
 * Lightweight OpenAI-compatible client used to talk to OpenRouter, Gemini
 * (OpenAI-compat endpoint), Grok (xAI) and NVIDIA NIM.
 *
 * All four expose `/v1/chat/completions` (or equivalent) and `/v1/models`
 * with the same JSON shape, so we share one code path and parametrize
 * only the base URL / extra headers.
 */

function buildHeaders(provider: ProviderInfo, apiKey: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (provider.extra_headers_static) {
    Object.assign(headers, provider.extra_headers_static);
  }
  return headers;
}

function resolveBaseUrl(
  provider: ProviderInfo,
  metadata: Record<string, unknown> | null | undefined
): string {
  let url = provider.base_url;
  if (url.includes("{account_id}")) {
    const accountId =
      typeof metadata?.account_id === "string"
        ? (metadata.account_id as string).trim()
        : "";
    url = url.replace("{account_id}", accountId || "MISSING_ACCOUNT_ID");
  }
  return url;
}

export async function validateProviderKey(
  provider: ProviderInfo,
  apiKey: string,
  metadata?: Record<string, unknown> | null
): Promise<ValidateResult> {
  try {
    const baseUrl = resolveBaseUrl(provider, metadata);
    const res = await fetch(`${baseUrl}/models`, {
      headers: buildHeaders(provider, apiKey),
    });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json().catch(() => ({}))) as {
      data?: Array<{
        id?: string;
        name?: string;
        context_length?: number;
      }>;
    };
    const models: ModelInfo[] = (data.data ?? [])
      .map((m) => ({
        id: String(m.id ?? ""),
        name: String(m.name ?? m.id ?? ""),
        context_length:
          typeof m.context_length === "number" ? m.context_length : undefined,
      }))
      .filter((m) => m.id.length > 0);
    return { ok: true, models };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listProviderModels(
  provider: ProviderInfo,
  apiKey: string
): Promise<ModelInfo[]> {
  const r = await validateProviderKey(provider, apiKey);
  return r.ok && r.models ? r.models : [];
}

/**
 * Stream a chat completion. Yields ChatChunk objects as the underlying
 * provider streams SSE tokens. The function never throws on provider
 * errors; instead it yields a `{ type: "error" }` chunk so callers can
 * handle fallback uniformly.
 */
export async function* streamProviderChat(
  provider: ProviderInfo,
  args: ChatStreamArgs
): AsyncGenerator<ChatChunk, void, unknown> {
  let res: Response;
  try {
    const baseUrl = resolveBaseUrl(provider, args.metadata);
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(provider, args.apiKey),
      body: JSON.stringify({
        model: args.model,
        messages: args.messages,
        temperature: args.temperature,
        max_tokens: args.maxTokens,
        top_p: args.topP ?? 0.9,
        stream: true,
      }),
      signal: args.signal,
    });
  } catch (e) {
    yield {
      type: "error",
      message: e instanceof Error ? e.message : String(e),
      code: "network_error",
    };
    return;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let code = "provider_error";
    if (res.status === 401 || res.status === 403) code = "invalid_key";
    else if (res.status === 404) code = "unsupported_model";
    else if (res.status === 408 || res.status === 504) code = "timeout";
    else if (res.status === 429) code = "rate_limit";
    else if (res.status >= 500) code = "provider_error";
    // Pull a concise error message out of the provider's JSON body when present.
    let message = `HTTP ${res.status}`;
    if (text) {
      try {
        const parsed = JSON.parse(text);
        const candidate =
          parsed?.error?.message ??
          parsed?.error ??
          parsed?.message ??
          parsed?.detail;
        if (typeof candidate === "string" && candidate.length > 0) {
          message = candidate;
        } else {
          message = text;
        }
      } catch {
        message = text;
      }
    }
    yield {
      type: "error",
      message: `${provider.label}: ${message}`,
      code,
    };
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    yield { type: "error", message: "No response body", code: "network_error" };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let textOut = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const rawLine = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!rawLine.startsWith("data:")) continue;
      const data = rawLine.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const token =
          parsed?.choices?.[0]?.delta?.content ??
          parsed?.choices?.[0]?.message?.content;
        if (typeof token === "string" && token.length > 0) {
          textOut += token;
          yield { type: "token", token };
        }
        if (parsed?.usage) {
          inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
          outputTokens = parsed.usage.completion_tokens ?? outputTokens;
        }
      } catch {
        // skip malformed chunk
      }
    }
  }

  if (outputTokens === 0) outputTokens = Math.ceil(textOut.length / 4);
  yield {
    type: "usage",
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  };
  yield { type: "done" };
}
