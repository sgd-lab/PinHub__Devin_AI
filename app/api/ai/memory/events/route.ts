import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = [
  "accepted_suggestion",
  "rejected_suggestion",
  "favorite_style",
  "creator_goal",
  "preferred_tone",
] as const;
type Kind = (typeof KINDS)[number];

function isKind(s: unknown): s is Kind {
  return typeof s === "string" && (KINDS as readonly string[]).includes(s);
}

interface EventRow {
  id: string;
  kind: Kind;
  payload: Record<string, unknown>;
  weight: number;
  created_at: string;
  source_session_id: string | null;
  source_message_id: string | null;
}

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const kindFilter = searchParams.get("kind");
  let q = sb
    .from("ai_memory_events")
    .select("id, kind, payload, weight, created_at, source_session_id, source_message_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (kindFilter && isKind(kindFilter)) q = q.eq("kind", kindFilter);

  const { data, error } = await q.returns<EventRow[]>();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ events: data ?? [] });
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
    kind?: string;
    payload?: Record<string, unknown>;
    weight?: number;
    source_session_id?: string;
    source_message_id?: string;
  } | null;

  if (!body || !isKind(body.kind) || !body.payload || typeof body.payload !== "object") {
    return NextResponse.json(
      {
        error: `Invalid body. Expected { kind: ${KINDS.join("|")}, payload: object }`,
      },
      { status: 400 }
    );
  }

  const insert: Record<string, unknown> = {
    user_id: user.id,
    kind: body.kind,
    payload: body.payload,
  };
  if (typeof body.weight === "number") insert.weight = body.weight;
  if (typeof body.source_session_id === "string") insert.source_session_id = body.source_session_id;
  if (typeof body.source_message_id === "string") insert.source_message_id = body.source_message_id;

  const { data, error } = await sb
    .from("ai_memory_events")
    .insert(insert)
    .select("id, kind, payload, weight, created_at, source_session_id, source_message_id")
    .single<EventRow>();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to insert event" },
      { status: 500 }
    );
  }
  return NextResponse.json({ event: data });
}

export async function DELETE(req: NextRequest) {
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
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const { error } = await sb
    .from("ai_memory_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
