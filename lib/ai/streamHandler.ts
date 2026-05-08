import type { AITaskKind, ChatMessage } from "./providers/types";

export interface StreamOptions {
  /**
   * Server-side route mode. When `task` is provided, the call is proxied
   * through `/api/ai/chat` and the user's stored, encrypted key is used
   * server-side. The legacy `baseUrl` + `apiKey` + `model` fields below
   * are then ignored.
   */
  task?: AITaskKind;

  /** @deprecated kept for backwards compatibility with the old direct flow */
  baseUrl?: string;
  /** @deprecated kept for backwards compatibility with the old direct flow */
  apiKey?: string;
  /** @deprecated kept for backwards compatibility with the old direct flow */
  model?: string;

  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  topP?: number;
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  onUsage?: (usage: { input_tokens: number; output_tokens: number }) => void;
  onMeta?: (meta: {
    provider: string;
    model: string;
    attempt: "primary" | "fallback";
  }) => void;
  signal?: AbortSignal;
}

/**
 * Stream a chat completion. Always routes through the server-side
 * `/api/ai/chat` endpoint when a `task` is provided, so the user's API
 * key is never exposed to the browser.
 */
export async function streamCompletion(options: StreamOptions): Promise<void> {
  const {
    task,
    messages,
    temperature,
    maxTokens,
    onToken,
    onComplete,
    onError,
    onUsage,
    onMeta,
    signal,
  } = options;

  if (!task) {
    onError(
      new Error(
        "streamCompletion: a `task` is required. Direct provider calls from the client are no longer supported."
      )
    );
    return;
  }

  let response: Response;
  try {
    response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task,
        messages,
        temperature,
        maxTokens,
      }),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    onError(e instanceof Error ? e : new Error(String(e)));
    return;
  }

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const j = await response.json();
      if (j?.error) msg = j.error;
    } catch {
      // ignore
    }
    onError(new Error(msg));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError(new Error("No response body from /api/ai/chat"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = event
        .split("\n")
        .find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const payload = dataLine.slice(5).trim();
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload);
        switch (parsed.type) {
          case "token":
            if (typeof parsed.token === "string") {
              fullText += parsed.token;
              onToken(parsed.token);
            }
            break;
          case "usage":
            if (parsed.usage) onUsage?.(parsed.usage);
            break;
          case "meta":
            onMeta?.({
              provider: parsed.provider,
              model: parsed.model,
              attempt: parsed.attempt,
            });
            break;
          case "error":
            onError(new Error(parsed.message ?? "Provider error"));
            break;
          case "done":
            onComplete(fullText);
            return;
        }
      } catch {
        // skip malformed event
      }
    }
  }

  onComplete(fullText);
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  // approximate costs per 1M tokens
  const costs: Record<string, { input: number; output: number }> = {
    default: { input: 0.5, output: 1.5 },
    "claude-3.5-sonnet": { input: 3, output: 15 },
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "llama-3.1": { input: 0.2, output: 0.2 },
    "gemini-1.5-flash": { input: 0.075, output: 0.3 },
    "gemini-1.5-pro": { input: 1.25, output: 5 },
    "grok-2": { input: 2, output: 10 },
  };

  const modelKey =
    Object.keys(costs).find((k) => model.toLowerCase().includes(k)) ||
    "default";
  const rate = costs[modelKey];

  return (
    (inputTokens / 1_000_000) * rate.input +
    (outputTokens / 1_000_000) * rate.output
  );
}
