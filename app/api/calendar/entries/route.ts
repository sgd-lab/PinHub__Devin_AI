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

interface IncomingEntry {
  scheduled_for: string;
  scheduled_time?: string | null;
  content_type?: string;
  title?: string | null;
  run_id?: string | null;
  run_type?: string | null;
  pin_index?: number | null;
  payload?: Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx)
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = ctx.sb
    .from("calendar_entries")
    .select("*")
    .eq("user_id", ctx.user.id)
    .order("scheduled_for", { ascending: true });

  if (from) query = query.gte("scheduled_for", from);
  if (to) query = query.lte("scheduled_for", to);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx)
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = (await req.json().catch(() => null)) as {
    entries?: IncomingEntry[];
  } | null;

  if (!body || !Array.isArray(body.entries) || body.entries.length === 0) {
    return NextResponse.json(
      { error: "Body must be { entries: [...] } with at least one entry." },
      { status: 400 }
    );
  }

  if (body.entries.length > 200) {
    return NextResponse.json(
      { error: "Cannot insert more than 200 entries at once." },
      { status: 400 }
    );
  }

  const rows = body.entries.map((e) => ({
    user_id: ctx.user.id,
    run_id: e.run_id ?? null,
    run_type: e.run_type ?? null,
    pin_index: typeof e.pin_index === "number" ? e.pin_index : null,
    scheduled_for: e.scheduled_for,
    scheduled_time: e.scheduled_time ?? null,
    content_type: e.content_type ?? "pin",
    status: "scheduled",
    title: e.title ?? null,
    payload: e.payload ?? {},
  }));

  for (const r of rows) {
    if (
      typeof r.scheduled_for !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(r.scheduled_for)
    ) {
      return NextResponse.json(
        { error: `Invalid scheduled_for: ${r.scheduled_for}` },
        { status: 400 }
      );
    }
  }

  const { data, error } = await ctx.sb
    .from("calendar_entries")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: data?.length ?? 0, entries: data ?? [] });
}
