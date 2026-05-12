import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Calendar Fill — looks at the current user's `calendar_entries` for the
 * next N days (default 7) and inserts a placeholder entry for every day
 * that has zero entries yet. The placeholder is a `status='draft'` row
 * the creator can fill in by hand from the calendar grid, or replace
 * later via a Save / Add-to-Calendar action.
 *
 * Pulls N from `automation_settings.calendar_fill_days_ahead` so the
 * setting in the Automation Hub UI is the single source of truth.
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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function POST() {
  const ctx = await requireUser();
  if ("error" in ctx)
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  // Pull configured horizon, fall back to 7.
  const { data: settings } = await ctx.sb
    .from("automation_settings")
    .select("calendar_fill_days_ahead")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  const daysAhead = settings?.calendar_fill_days_ahead ?? 7;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + daysAhead - 1);

  // Find already-occupied days so we only fill the gaps.
  const { data: existing, error: existingErr } = await ctx.sb
    .from("calendar_entries")
    .select("scheduled_for")
    .eq("user_id", ctx.user.id)
    .gte("scheduled_for", isoDate(today))
    .lte("scheduled_for", isoDate(horizon));

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  const taken = new Set((existing ?? []).map((r) => r.scheduled_for as string));
  const inserts: Array<{
    user_id: string;
    scheduled_for: string;
    content_type: string;
    status: string;
    title: string;
    payload: Record<string, unknown>;
  }> = [];

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    const day = isoDate(d);
    if (taken.has(day)) continue;
    inserts.push({
      user_id: ctx.user.id,
      scheduled_for: day,
      content_type: "pin",
      status: "draft",
      title: "Placeholder — draft a pin for this day",
      payload: { source: "calendar-fill" },
    });
  }

  if (inserts.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, days_ahead: daysAhead });
  }

  const { error: insertErr } = await ctx.sb
    .from("calendar_entries")
    .insert(inserts);

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: inserts.length,
    days_ahead: daysAhead,
  });
}
