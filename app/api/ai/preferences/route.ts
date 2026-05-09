import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import {
  deleteModelPreference,
  listModelPreferences,
  upsertModelPreference,
} from "@/lib/ai/aiSettingsRepository";
import { isProviderId } from "@/lib/ai/providers/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TASKS = ["pin", "guide", "inspiration", "chat"] as const;
type TaskKind = (typeof TASKS)[number];

function isTask(s: unknown): s is TaskKind {
  return typeof s === "string" && (TASKS as readonly string[]).includes(s);
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
  const prefs = await listModelPreferences(sb, user.id);
  return NextResponse.json({ preferences: prefs });
}

export async function PUT(req: NextRequest) {
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

  const body = (await req.json().catch(() => null)) as {
    task?: string;
    provider?: string;
    model?: string;
    fallback_provider?: string | null;
    fallback_model?: string | null;
  } | null;

  if (
    !body ||
    !isTask(body.task) ||
    !isProviderId(body.provider) ||
    typeof body.model !== "string" ||
    body.model.length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid request: { task, provider, model, fallback_provider?, fallback_model? }",
      },
      { status: 400 }
    );
  }

  const fbProvider =
    body.fallback_provider && isProviderId(body.fallback_provider)
      ? body.fallback_provider
      : null;
  const fbModel =
    typeof body.fallback_model === "string" && body.fallback_model.length > 0
      ? body.fallback_model
      : null;

  const row = await upsertModelPreference(sb, user.id, {
    task: body.task,
    provider: body.provider,
    model: body.model,
    fallback_provider: fbProvider,
    fallback_model: fbModel,
  });
  if (!row) {
    return NextResponse.json(
      { error: "Failed to save preference" },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, preference: row });
}

export async function DELETE(req: NextRequest) {
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
    return NextResponse.json({ error: "Invalid task" }, { status: 400 });
  }
  const ok = await deleteModelPreference(sb, user.id, task);
  return NextResponse.json({ ok });
}
