import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read / write the current user's automation settings row in Supabase.
 *
 * GET  → returns the row, creating defaults on-the-fly if it doesn't
 *         exist yet (so the UI never has to handle "missing row").
 * PATCH → upserts the row with any of the toggle / config fields the
 *         caller wants to change. Unspecified fields keep their value.
 */

async function requireUser() {
  const sb = getSupabaseServerClient();
  if (!sb) return { error: "Supabase not configured", status: 500 as const };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Not authenticated", status: 401 as const };
  return { sb, user };
}

interface AutomationSettingsRow {
  user_id: string;
  daily_run_enabled: boolean;
  daily_run_time: string;
  daily_content_type: "daily" | "single" | "three";
  calendar_fill_enabled: boolean;
  calendar_fill_days_ahead: number;
  notion_auto_sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULTS: Omit<AutomationSettingsRow, "user_id" | "created_at" | "updated_at"> = {
  daily_run_enabled: false,
  daily_run_time: "06:00",
  daily_content_type: "daily",
  calendar_fill_enabled: false,
  calendar_fill_days_ahead: 7,
  notion_auto_sync_enabled: false,
};

export async function GET() {
  const ctx = await requireUser();
  if ("error" in ctx)
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { data, error } = await ctx.sb
    .from("automation_settings")
    .select("*")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ settings: { user_id: ctx.user.id, ...DEFAULTS } });
  }
  return NextResponse.json({ settings: data });
}

interface PatchBody {
  daily_run_enabled?: boolean;
  daily_run_time?: string;
  daily_content_type?: "daily" | "single" | "three";
  calendar_fill_enabled?: boolean;
  calendar_fill_days_ahead?: number;
  notion_auto_sync_enabled?: boolean;
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx)
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Whitelist + light validation. Everything stays inside our schema's
  // CHECK constraints — the DB will reject bad values, but we
  // pre-validate here so we can return a friendlier 400.
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.daily_run_enabled === "boolean")
    update.daily_run_enabled = body.daily_run_enabled;
  if (typeof body.daily_run_time === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(body.daily_run_time))
    update.daily_run_time = body.daily_run_time;
  if (
    body.daily_content_type === "daily" ||
    body.daily_content_type === "single" ||
    body.daily_content_type === "three"
  )
    update.daily_content_type = body.daily_content_type;
  if (typeof body.calendar_fill_enabled === "boolean")
    update.calendar_fill_enabled = body.calendar_fill_enabled;
  if (typeof body.calendar_fill_days_ahead === "number") {
    if (
      body.calendar_fill_days_ahead < 1 ||
      body.calendar_fill_days_ahead > 30
    ) {
      return NextResponse.json(
        { error: "calendar_fill_days_ahead must be between 1 and 30" },
        { status: 400 }
      );
    }
    update.calendar_fill_days_ahead = Math.round(body.calendar_fill_days_ahead);
  }
  if (typeof body.notion_auto_sync_enabled === "boolean")
    update.notion_auto_sync_enabled = body.notion_auto_sync_enabled;

  const row = { user_id: ctx.user.id, ...update };

  const { data, error } = await ctx.sb
    .from("automation_settings")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}
