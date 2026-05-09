"use client";

import { db } from "@/lib/db/dexie";
import { useUserStore } from "@/stores/userStore";
import type { BrandMemoryEntry } from "@/lib/auth/types";
import type { OutputRating, RunType } from "./contextualPromptAssembler";

export type { OutputRating } from "./contextualPromptAssembler";

interface RecordRatingArgs {
  runId: string;
  rating: OutputRating;
  runType: RunType;
  niche: string;
  snippet: string;
}

interface FeedbackResponse {
  id: string;
  created_at: string;
  value: {
    run_id: string;
    rating: OutputRating;
    run_type: RunType;
    niche: string;
    snippet: string;
    generated_at: string;
  };
  weight: number;
}

interface FeedbackErrorResponse {
  error: string;
}

/**
 * Mark a generation run with a rating. Persists to Supabase
 * (brand_memory.kind=rated_output) AND mirrors to Dexie so the local
 * library reflects it instantly.
 */
export async function recordOutputRating(
  args: RecordRatingArgs
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/ai/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      run_id: args.runId,
      rating: args.rating,
      run_type: args.runType,
      niche: args.niche,
      snippet: args.snippet,
    }),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as FeedbackErrorResponse;
      if (j?.error) msg = j.error;
    } catch {
      // ignore
    }
    return { ok: false, error: msg };
  }

  const json = (await res.json()) as FeedbackResponse;

  // Mirror to Dexie so the library + run history reflect the rating.
  try {
    await db.runs.update(args.runId, { rating: args.rating });
  } catch {
    // run might not exist locally (e.g. came from server) — ignore
  }

  // Mirror into the in-memory user store so the next prompt assembly sees it.
  const store = useUserStore.getState();
  const next: BrandMemoryEntry[] = [
    {
      id: json.id,
      user_id: store.authUser?.id ?? "",
      kind: "rated_output",
      value: json.value,
      weight: json.weight,
      created_at: json.created_at,
      updated_at: json.created_at,
    },
    ...store.memory.filter((m) => {
      if (m.kind !== "rated_output") return true;
      const v = m.value as { run_id?: string } | null;
      return !v || v.run_id !== args.runId;
    }),
  ];
  store.setMemory(next);

  return { ok: true };
}

/**
 * Remove a previously recorded rating for a run.
 */
export async function clearOutputRating(
  runId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/ai/feedback?run_id=${encodeURIComponent(runId)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as FeedbackErrorResponse;
      if (j?.error) msg = j.error;
    } catch {
      // ignore
    }
    return { ok: false, error: msg };
  }

  try {
    await db.runs.update(runId, { rating: null });
  } catch {
    // ignore
  }

  const store = useUserStore.getState();
  store.setMemory(
    store.memory.filter((m) => {
      if (m.kind !== "rated_output") return true;
      const v = m.value as { run_id?: string } | null;
      return !v || v.run_id !== runId;
    })
  );

  return { ok: true };
}

/**
 * Build a short snippet (used for feedback signal in future prompts) from
 * the parsed fields of a run.
 */
export function buildRatingSnippet(
  parsedFields: Record<string, unknown>
): string {
  const candidates: string[] = [];
  const title = parsedFields.title;
  const desc = parsedFields.description;
  const hook = parsedFields.hook;
  const story = parsedFields.story;
  if (typeof title === "string" && title.trim()) candidates.push(title.trim());
  if (typeof hook === "string" && hook.trim()) candidates.push(hook.trim());
  if (typeof desc === "string" && desc.trim())
    candidates.push(desc.trim().slice(0, 160));
  if (typeof story === "string" && story.trim())
    candidates.push(story.trim().slice(0, 160));
  return candidates.join(" — ").slice(0, 600);
}
