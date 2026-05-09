import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import {
  deleteUserTaskPrompt,
  listUserTaskPrompts,
  upsertUserTaskPrompt,
} from "@/lib/prompts/userTaskPromptsRepository";
import {
  isUserTaskPromptKind,
  type UserTaskPromptDTO,
} from "@/lib/prompts/types";

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

export async function GET() {
  const ctx = await requireUser();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const rows = await listUserTaskPrompts(ctx.sb, ctx.user.id);
  const prompts: UserTaskPromptDTO[] = rows.map((r) => ({
    task: r.task,
    name: r.name,
    prompt_text: r.prompt_text,
    version: r.version,
    history: r.history ?? [],
    is_default_override: r.is_default_override,
    updated_at: r.updated_at ?? null,
  }));
  return NextResponse.json({ prompts });
}

export async function PUT(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const body = (await req.json().catch(() => null)) as {
    task?: string;
    prompt_text?: string;
    name?: string;
  } | null;
  if (
    !body ||
    !isUserTaskPromptKind(body.task) ||
    typeof body.prompt_text !== "string" ||
    body.prompt_text.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "Invalid request: { task, prompt_text, name? }" },
      { status: 400 }
    );
  }
  const row = await upsertUserTaskPrompt(
    ctx.sb,
    ctx.user.id,
    body.task,
    body.prompt_text,
    body.name
  );
  if (!row) {
    return NextResponse.json(
      { error: "Failed to save prompt" },
      { status: 500 }
    );
  }
  const dto: UserTaskPromptDTO = {
    task: row.task,
    name: row.name,
    prompt_text: row.prompt_text,
    version: row.version,
    history: row.history ?? [],
    is_default_override: row.is_default_override,
    updated_at: row.updated_at ?? null,
  };
  return NextResponse.json({ ok: true, prompt: dto });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { searchParams } = new URL(req.url);
  const task = searchParams.get("task");
  if (!isUserTaskPromptKind(task)) {
    return NextResponse.json({ error: "Invalid task" }, { status: 400 });
  }
  const ok = await deleteUserTaskPrompt(ctx.sb, ctx.user.id, task);
  return NextResponse.json({ ok });
}
