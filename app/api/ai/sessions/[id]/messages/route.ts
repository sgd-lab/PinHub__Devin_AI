import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import {
  loadCreatorContext,
  buildAssistantSystemPrompt,
  composeAssistantMessages,
} from "@/lib/ai/assistantContext";
import { runChatStream } from "@/lib/ai/serverAi";
import {
  PROVIDERS,
  isProviderId,
  type AITaskKind,
  type ChatMessage,
  type ProviderId,
} from "@/lib/ai/providers/types";
import { decryptApiKey } from "@/lib/auth/keyCrypto";
import { streamProviderChat } from "@/lib/ai/providers/openaiCompat";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MessageRow {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  provider: string | null;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  error_code: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  title: string;
  provider: string | null;
  model: string | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = getSupabaseServerClient();
  if (!sb) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: session } = await sb
    .from("ai_chat_sessions")
    .select("id, user_id, title, provider, model")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle<SessionRow>();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data, error } = await sb
    .from("ai_chat_messages")
    .select("id, role, content, provider, model, tokens_in, tokens_out, error_code, created_at")
    .eq("session_id", params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .returns<MessageRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ session, messages: data ?? [] });
}

/**
 * Clear all messages in this session (keep the session row itself).
 * Used by "Clear chat" in the UI.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = getSupabaseServerClient();
  if (!sb) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await sb
    .from("ai_chat_messages")
    .delete()
    .eq("session_id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Send a user message, stream assistant reply via SSE, and persist both.
 * Body: { content: string, regenerate?: boolean, provider?, model? }
 *
 * If `regenerate: true`, we delete the most recent assistant message (and
 * any trailing assistants) and re-run from the most recent user turn.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = getSupabaseServerClient();
  if (!sb) {
    return new Response(JSON.stringify({ error: "Supabase not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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
    content?: string;
    regenerate?: boolean;
    provider?: string;
    model?: string;
  } | null;

  const { data: session } = await sb
    .from("ai_chat_sessions")
    .select("id, user_id, title, provider, model")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle<SessionRow>();
  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // For regenerate, we strip trailing assistants and reuse the last user turn.
  // For a fresh send, we require `content`.
  let userContentForRun: string | null = null;
  if (body?.regenerate) {
    const { data: msgs } = await sb
      .from("ai_chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", params.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .returns<{ id: string; role: string; content: string; created_at: string }[]>();
    if (!msgs || msgs.length === 0) {
      return new Response(JSON.stringify({ error: "Nothing to regenerate" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Find last user message; delete everything after it.
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      if (msgs[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) {
      return new Response(JSON.stringify({ error: "No user message to regenerate from" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    userContentForRun = msgs[lastUserIdx].content;
    const idsToDelete = msgs.slice(lastUserIdx + 1).map((m) => m.id);
    if (idsToDelete.length > 0) {
      await sb.from("ai_chat_messages").delete().in("id", idsToDelete).eq("user_id", user.id);
    }
  } else {
    if (!body?.content || typeof body.content !== "string" || !body.content.trim()) {
      return new Response(JSON.stringify({ error: "Missing content" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    userContentForRun = body.content.trim();
    // Persist user message before streaming so the UI's optimistic state is durable.
    const { error: insErr } = await sb.from("ai_chat_messages").insert({
      session_id: params.id,
      user_id: user.id,
      role: "user",
      content: userContentForRun,
    });
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Optionally pin a different provider/model for THIS session before streaming.
  let pinnedProvider: ProviderId | null = isProviderId(session.provider) ? session.provider : null;
  let pinnedModel = session.model;
  if (body?.provider && isProviderId(body.provider)) {
    pinnedProvider = body.provider;
  }
  if (typeof body?.model === "string" && body.model.length > 0) {
    pinnedModel = body.model;
  }
  if (pinnedProvider !== session.provider || pinnedModel !== session.model) {
    await sb
      .from("ai_chat_sessions")
      .update({ provider: pinnedProvider, model: pinnedModel })
      .eq("id", params.id)
      .eq("user_id", user.id);
  }

  // Build the prompt: system + recent history + current user turn.
  const ctx = await loadCreatorContext(sb, user.id);
  const systemPrompt = buildAssistantSystemPrompt(ctx);
  const { data: history } = await sb
    .from("ai_chat_messages")
    .select("role, content, created_at")
    .eq("session_id", params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .returns<{ role: "user" | "assistant" | "system"; content: string; created_at: string }[]>();

  // Strip the just-inserted user message from history (it's the new turn).
  const trimmedHistory = (history ?? []).slice(0, -1);
  const composed = composeAssistantMessages({
    systemPrompt,
    history: trimmedHistory,
    userMessage: userContentForRun ?? "",
  });

  // If the session pins a provider/model, stream directly via that. Otherwise,
  // use the task-resolved chat pipeline (with fallback). Either path persists
  // the assistant message at the end via SSE consumer below.
  const encoder = new TextEncoder();
  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantBuf = "";
      let resolvedProvider: string | null = null;
      let resolvedModel: string | null = null;
      let tokensIn: number | null = null;
      let tokensOut: number | null = null;
      let errorCode: string | null = null;

      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        if (pinnedProvider && pinnedModel) {
          const apiKey = await loadKey(sb, user.id, pinnedProvider);
          if (!apiKey) {
            send({
              type: "error",
              code: "no_provider",
              message: `No stored key for ${PROVIDERS[pinnedProvider].label}.`,
            });
            send({ type: "done" });
            controller.close();
            return;
          }
          send({
            type: "meta",
            provider: pinnedProvider,
            model: pinnedModel,
            attempt: "primary",
          });
          resolvedProvider = pinnedProvider;
          resolvedModel = pinnedModel;
          for await (const chunk of streamProviderChat(PROVIDERS[pinnedProvider], {
            apiKey,
            model: pinnedModel,
            messages: composed as ChatMessage[],
            temperature: 0.7,
            maxTokens: 2000,
            signal: abortController.signal,
          })) {
            if (chunk.type === "token") assistantBuf += chunk.token;
            if (chunk.type === "usage") {
              tokensIn = chunk.usage.input_tokens;
              tokensOut = chunk.usage.output_tokens;
            }
            if (chunk.type === "error") errorCode = chunk.code ?? "provider_error";
            send(chunk);
            if (chunk.type === "done") break;
          }
        } else {
          for await (const chunk of runChatStream({
            sb,
            userId: user.id,
            task: "chat" satisfies AITaskKind,
            messages: composed as ChatMessage[],
            temperature: 0.7,
            maxTokens: 2000,
            signal: abortController.signal,
          })) {
            if (chunk.type === "meta") {
              resolvedProvider = chunk.provider;
              resolvedModel = chunk.model;
            }
            if (chunk.type === "token") assistantBuf += chunk.token;
            if (chunk.type === "usage") {
              tokensIn = chunk.usage.input_tokens;
              tokensOut = chunk.usage.output_tokens;
            }
            if (chunk.type === "error") errorCode = chunk.code ?? "provider_error";
            send(chunk);
            if (chunk.type === "done") break;
          }
        }
      } catch (e) {
        errorCode = "internal_error";
        send({
          type: "error",
          code: "internal_error",
          message: e instanceof Error ? e.message : String(e),
        });
      }

      // Persist the assistant message (even partial / error) so the UI history is consistent.
      const persistContent = assistantBuf.length > 0
        ? assistantBuf
        : errorCode
          ? `[${errorCode}] generation failed`
          : "";
      if (persistContent.length > 0) {
        await sb.from("ai_chat_messages").insert({
          session_id: params.id,
          user_id: user.id,
          role: "assistant",
          content: persistContent,
          provider: resolvedProvider,
          model: resolvedModel,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          error_code: errorCode,
        });
      }
      await sb
        .from("ai_chat_sessions")
        .update({ last_error_code: errorCode })
        .eq("id", params.id)
        .eq("user_id", user.id);

      controller.close();
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

async function loadKey(
  sb: SupabaseClient,
  userId: string,
  provider: ProviderId
): Promise<string | null> {
  const { data } = await sb
    .from("user_api_keys")
    .select("encrypted_key, iv, auth_tag")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle<{ encrypted_key: string; iv: string; auth_tag: string }>();
  if (!data) return null;
  try {
    return decryptApiKey({
      encrypted_key: data.encrypted_key,
      iv: data.iv,
      auth_tag: data.auth_tag,
    });
  } catch {
    return null;
  }
}
