import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { runChatStream } from "@/lib/ai/serverAi";
import { estimateProviderCost } from "@/lib/ai/usageCost";
import { rateLimit, rateLimitHeaders } from "@/lib/security/rateLimiter";
import type {
  AITaskKind,
  ChatMessage,
  ProviderId,
} from "@/lib/ai/providers/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TASKS = ["pin", "guide", "inspiration", "chat"] as const;
type TaskKind = (typeof TASKS)[number];

function isTask(s: unknown): s is TaskKind {
  return typeof s === "string" && (TASKS as readonly string[]).includes(s);
}

function isChatMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== "object") return false;
  const obj = m as Record<string, unknown>;
  return (
    (obj.role === "system" || obj.role === "user" || obj.role === "assistant") &&
    typeof obj.content === "string"
  );
}

function sseEncode(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServerClient();
  if (!sb) {
    return new Response(
      JSON.stringify({ error: "Supabase not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rl = rateLimit(user.id, "ai-generate");
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: `You're sending requests too quickly. Try again in a moment (limit: ${rl.limit}/min).`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.max(1, Math.ceil((rl.resetAtMs - Date.now()) / 1000))),
          ...rateLimitHeaders(rl),
        },
      }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    task?: string;
    messages?: unknown;
    temperature?: number;
    maxTokens?: number;
  } | null;

  if (
    !body ||
    !isTask(body.task) ||
    !Array.isArray(body.messages) ||
    !body.messages.every(isChatMessage)
  ) {
    return new Response(
      JSON.stringify({
        error: "Invalid request: { task, messages, temperature?, maxTokens? }",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const temperature =
    typeof body.temperature === "number" ? body.temperature : 0.7;
  const maxTokens =
    typeof body.maxTokens === "number" ? body.maxTokens : 2000;

  const encoder = new TextEncoder();
  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let activeProvider: ProviderId | null = null;
      let activeModel: string | null = null;
      let attempt: "primary" | "fallback" = "primary";
      let inputTokens = 0;
      let outputTokens = 0;
      let didError = false;

      try {
        for await (const chunk of runChatStream({
          sb,
          userId: user.id,
          task: body.task as TaskKind,
          messages: body.messages as ChatMessage[],
          temperature,
          maxTokens,
          signal: abortController.signal,
        })) {
          if (chunk.type === "meta") {
            activeProvider = chunk.provider;
            activeModel = chunk.model;
            attempt = chunk.attempt;
          } else if (chunk.type === "usage") {
            inputTokens = chunk.usage.input_tokens;
            outputTokens = chunk.usage.output_tokens;
          } else if (chunk.type === "error") {
            didError = true;
          }
          controller.enqueue(encoder.encode(sseEncode(chunk)));
        }
      } catch (e) {
        didError = true;
        controller.enqueue(
          encoder.encode(
            sseEncode({
              type: "error",
              code: "internal_error",
              message: e instanceof Error ? e.message : String(e),
            })
          )
        );
      } finally {
        controller.close();

        // Persist usage row if we got at least a provider + model. We log
        // even if tokens are 0 (some providers omit usage), but skip when
        // the entire run errored before any provider was resolved.
        if (
          activeProvider &&
          activeModel &&
          !(didError && inputTokens === 0 && outputTokens === 0)
        ) {
          const cost = estimateProviderCost(
            activeProvider,
            activeModel,
            inputTokens,
            outputTokens
          );
          try {
            await sb.from("ai_usage_log").insert({
              user_id: user.id,
              task: body.task as AITaskKind,
              provider: activeProvider,
              model: activeModel,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cost_estimate: cost,
              attempt,
            });
          } catch {
            // never fail the response because of logging
          }
        }
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
