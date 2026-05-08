import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { isProviderId } from "@/lib/ai/providers/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SessionRow {
  id: string;
  title: string;
  provider: string | null;
  model: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export async function GET() {
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

  const { data, error } = await sb
    .from("ai_chat_sessions")
    .select("id, title, provider, model, last_error_code, created_at, updated_at, last_message_at")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false })
    .limit(100)
    .returns<SessionRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(req: NextRequest) {
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

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    provider?: string;
    model?: string;
  } | null;

  const insert: Record<string, unknown> = {
    user_id: user.id,
    title: typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "New chat",
  };
  if (body?.provider && isProviderId(body.provider)) {
    insert.provider = body.provider;
  }
  if (typeof body?.model === "string" && body.model.length > 0) {
    insert.model = body.model;
  }

  const { data, error } = await sb
    .from("ai_chat_sessions")
    .insert(insert)
    .select("id, title, provider, model, last_error_code, created_at, updated_at, last_message_at")
    .single<SessionRow>();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create session" },
      { status: 500 }
    );
  }

  return NextResponse.json({ session: data });
}
