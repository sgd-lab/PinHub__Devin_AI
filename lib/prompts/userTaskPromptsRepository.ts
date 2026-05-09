import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserTaskPromptKind } from "@/lib/prompts/types";

export interface UserTaskPromptRow {
  id: string;
  user_id: string;
  task: UserTaskPromptKind;
  name: string;
  prompt_text: string;
  version: number;
  history: Array<{
    version: number;
    prompt_text: string;
    saved_at: string;
  }>;
  is_default_override: boolean;
  created_at?: string;
  updated_at?: string;
}

const HISTORY_LIMIT = 10;

export async function listUserTaskPrompts(
  sb: SupabaseClient,
  userId: string
): Promise<UserTaskPromptRow[]> {
  const { data, error } = await sb
    .from("user_task_prompts")
    .select("*")
    .eq("user_id", userId)
    .returns<UserTaskPromptRow[]>();
  if (error) return [];
  return data ?? [];
}

export async function getUserTaskPrompt(
  sb: SupabaseClient,
  userId: string,
  task: UserTaskPromptKind
): Promise<UserTaskPromptRow | null> {
  const { data, error } = await sb
    .from("user_task_prompts")
    .select("*")
    .eq("user_id", userId)
    .eq("task", task)
    .maybeSingle<UserTaskPromptRow>();
  if (error || !data) return null;
  return data;
}

export async function upsertUserTaskPrompt(
  sb: SupabaseClient,
  userId: string,
  task: UserTaskPromptKind,
  promptText: string,
  name?: string
): Promise<UserTaskPromptRow | null> {
  const trimmed = promptText.trim();
  if (trimmed.length === 0) return null;

  const existing = await getUserTaskPrompt(sb, userId, task);
  let nextVersion = 1;
  let history: UserTaskPromptRow["history"] = [];

  if (existing) {
    nextVersion = existing.version + 1;
    history = [
      {
        version: existing.version,
        prompt_text: existing.prompt_text,
        saved_at: existing.updated_at ?? new Date().toISOString(),
      },
      ...(existing.history ?? []),
    ].slice(0, HISTORY_LIMIT);
  }

  const { data, error } = await sb
    .from("user_task_prompts")
    .upsert(
      {
        user_id: userId,
        task,
        name: name ?? existing?.name ?? "Default",
        prompt_text: trimmed,
        version: nextVersion,
        history,
        is_default_override: true,
      },
      { onConflict: "user_id,task" }
    )
    .select()
    .maybeSingle<UserTaskPromptRow>();
  if (error || !data) return null;
  return data;
}

export async function deleteUserTaskPrompt(
  sb: SupabaseClient,
  userId: string,
  task: UserTaskPromptKind
): Promise<boolean> {
  const { error } = await sb
    .from("user_task_prompts")
    .delete()
    .eq("user_id", userId)
    .eq("task", task);
  return !error;
}
