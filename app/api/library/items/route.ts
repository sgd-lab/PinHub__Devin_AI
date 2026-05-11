import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const sb = getSupabaseServerClient();
  if (!sb) return { error: "Supabase not configured", status: 500 as const };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Not authenticated", status: 401 as const };
  return { sb, user };
}

interface IncomingItem {
  title: string;
  description?: string | null;
  visual_prompt?: string | null;
  thumbnail_url?: string | null;
  run_id?: string | null;
  run_type?: string | null;
  pin_index?: number | null;
  is_favorite?: boolean;
  tags?: string[];
  payload?: Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx)
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { searchParams } = new URL(req.url);
  const favorites = searchParams.get("filter") === "favorites";
  const runId = searchParams.get("run_id");

  let query = ctx.sb
    .from("library_items")
    .select("*")
    .eq("user_id", ctx.user.id)
    .order("saved_at", { ascending: false });

  if (favorites) query = query.eq("is_favorite", true);
  if (runId) query = query.eq("run_id", runId);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx)
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = (await req.json().catch(() => null)) as {
    items?: IncomingItem[];
  } | null;

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "Body must be { items: [...] }." },
      { status: 400 }
    );
  }
  if (body.items.length > 100) {
    return NextResponse.json(
      { error: "Cannot save more than 100 items at once." },
      { status: 400 }
    );
  }

  const rows = body.items.map((i) => ({
    user_id: ctx.user.id,
    title: i.title?.trim() || "Untitled pin",
    description: i.description ?? null,
    visual_prompt: i.visual_prompt ?? null,
    thumbnail_url: i.thumbnail_url ?? null,
    run_id: i.run_id ?? null,
    run_type: i.run_type ?? null,
    pin_index: typeof i.pin_index === "number" ? i.pin_index : null,
    is_favorite: Boolean(i.is_favorite),
    tags: Array.isArray(i.tags) ? i.tags : [],
    payload: i.payload ?? {},
  }));

  const { data, error } = await ctx.sb
    .from("library_items")
    .insert(rows)
    .select();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: data?.length ?? 0, items: data ?? [] });
}
