import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { runChatStream } from "@/lib/ai/serverAi";
import type { ChatMessage } from "@/lib/ai/providers/types";

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
          controller.enqueue(encoder.encode(sseEncode(chunk)));
        }
      } catch (e) {
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
