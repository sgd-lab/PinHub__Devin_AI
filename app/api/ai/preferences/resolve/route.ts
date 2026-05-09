import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { describeResolution } from "@/lib/ai/serverAi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TASKS = ["pin", "guide", "inspiration", "chat"] as const;
type TaskKind = (typeof TASKS)[number];

function isTask(s: unknown): s is TaskKind {
  return typeof s === "string" && (TASKS as readonly string[]).includes(s);
}

/**
 * Returns the provider/model the chat route would pick for `task` right now,
 * without running a generation. Surfaces the configured fallback too so the
 * UI can show "primary → fallback" hints.
 */
export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const task = searchParams.get("task");
  if (!isTask(task)) {
    return NextResponse.json(
      { error: "Invalid task. Expected one of: pin, guide, inspiration, chat" },
      { status: 400 }
    );
  }

  const info = await describeResolution(sb, user.id, task);
  return NextResponse.json(info);
}
