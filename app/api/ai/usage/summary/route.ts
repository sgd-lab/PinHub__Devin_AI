import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { describeResolution } from "@/lib/ai/serverAi";
import { isProviderId, type AITaskKind } from "@/lib/ai/providers/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UsageRow {
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
  created_at: string;
}

export async function GET() {
  const sb = getSupabaseServerClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();

  const { data, error } = await sb
    .from("ai_usage_log")
    .select("provider, model, input_tokens, output_tokens, cost_estimate, created_at")
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth)
    .order("created_at", { ascending: false })
    .returns<UsageRow[]>();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        // The most common cause is migration 0007 not being applied yet.
        hint: "Apply supabase/migrations/0007_ai_usage_log.sql.",
      },
      { status: 500 }
    );
  }

  const rows = data ?? [];

  const today = rows.filter((r) => r.created_at >= startOfDay);

  let todayInput = 0;
  let todayOutput = 0;
  let todayCost = 0;
  for (const r of today) {
    todayInput += r.input_tokens;
    todayOutput += r.output_tokens;
    todayCost += Number(r.cost_estimate);
  }

  let monthInput = 0;
  let monthOutput = 0;
  let monthCost = 0;
  for (const r of rows) {
    monthInput += r.input_tokens;
    monthOutput += r.output_tokens;
    monthCost += Number(r.cost_estimate);
  }

  // Per-provider month breakdown, ordered by spend desc.
  const byProvider = new Map<
    string,
    { input: number; output: number; cost: number; runs: number }
  >();
  for (const r of rows) {
    const cur = byProvider.get(r.provider) ?? {
      input: 0,
      output: 0,
      cost: 0,
      runs: 0,
    };
    cur.input += r.input_tokens;
    cur.output += r.output_tokens;
    cur.cost += Number(r.cost_estimate);
    cur.runs += 1;
    byProvider.set(r.provider, cur);
  }

  const providers = Array.from(byProvider.entries())
    .map(([provider, v]) => ({
      provider,
      input_tokens: v.input,
      output_tokens: v.output,
      total_tokens: v.input + v.output,
      cost: Number(v.cost.toFixed(6)),
      runs: v.runs,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Best-effort "current_active" — what the chat task would resolve to right now.
  const chatRes = await describeResolution(
    sb,
    user.id,
    "chat" satisfies AITaskKind
  );
  const current_active = chatRes.primary
    ? {
        provider: chatRes.primary.provider,
        model: chatRes.primary.model,
        attempt: "primary" as const,
      }
    : rows[0] && isProviderId(rows[0].provider)
    ? {
        provider: rows[0].provider,
        model: rows[0].model,
        attempt: "primary" as const,
      }
    : null;

  return NextResponse.json({
    today: {
      input_tokens: todayInput,
      output_tokens: todayOutput,
      total_tokens: todayInput + todayOutput,
      cost: Number(todayCost.toFixed(6)),
      runs: today.length,
    },
    month: {
      input_tokens: monthInput,
      output_tokens: monthOutput,
      total_tokens: monthInput + monthOutput,
      cost: Number(monthCost.toFixed(6)),
      runs: rows.length,
    },
    providers,
    current_active,
  });
}
