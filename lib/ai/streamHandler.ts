export interface StreamOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature: number;
  maxTokens: number;
  topP?: number;
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  onUsage?: (usage: { input_tokens: number; output_tokens: number }) => void;
  signal?: AbortSignal;
}

export async function streamCompletion(options: StreamOptions): Promise<void> {
  const {
    baseUrl,
    apiKey,
    model,
    messages,
    temperature,
    maxTokens,
    topP = 0.9,
    onToken,
    onComplete,
    onError,
    onUsage,
    signal,
  } = options;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullText = "";
    let inputTokens = 0;
    let outputTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onToken(content);
          }
          if (parsed.usage) {
            inputTokens = parsed.usage.prompt_tokens || 0;
            outputTokens = parsed.usage.completion_tokens || 0;
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    if (outputTokens === 0) {
      outputTokens = Math.ceil(fullText.length / 4);
    }

    onUsage?.({ input_tokens: inputTokens, output_tokens: outputTokens });
    onComplete(fullText);
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    onError(error as Error);
  }
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
