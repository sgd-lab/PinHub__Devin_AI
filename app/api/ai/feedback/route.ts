import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATINGS = ["successful", "weak", "favorite"] as const;
type Rating = (typeof RATINGS)[number];

const RUN_TYPES = ["single", "daily", "guide", "mega"] as const;
type RunType = (typeof RUN_TYPES)[number];

interface FeedbackBody {
  run_id?: string;
  rating?: string;
  run_type?: string;
  niche?: string;
  snippet?: string;
  generated_at?: string;
}

function isRating(s: unknown): s is Rating {
  return typeof s === "string" && (RATINGS as readonly string[]).includes(s);
}

function isRunType(s: unknown): s is RunType {
  return typeof s === "string" && (RUN_TYPES as readonly string[]).includes(s);
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function requireUser(): Promise<
  | { ok: true; sb: NonNullable<ReturnType<typeof getSupabaseServerClient>>; userId: string }
  | { ok: false; response: Response }
> {
  const sb = getSupabaseServerClient();
  if (!sb) {
    return {
      ok: false,
      response: jsonResponse({ error: "Supabase not configured" }, 500),
    };
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: jsonResponse({ error: "Not authenticated" }, 401),
    };
  }
  return { ok: true, sb, userId: user.id };
}

/**
 * POST /api/ai/feedback
 * Body: { run_id, rating, run_type, niche, snippet, generated_at? }
 *
 * Upserts a single brand_memory row of kind=rated_output for this run.
 * If a previous rating exists for the same run_id, it is replaced.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { sb, userId } = auth;

  const body = (await req.json().catch(() => null)) as FeedbackBody | null;

  if (
    !body ||
    typeof body.run_id !== "string" ||
    !body.run_id.trim() ||
    !isRating(body.rating) ||
    !isRunType(body.run_type)
  ) {
    return jsonResponse(
      {
        error:
          "Invalid request. Expected { run_id, rating, run_type, niche?, snippet? }.",
      },
      400
    );
  }

  const value = {
    run_id: body.run_id,
    rating: body.rating,
    run_type: body.run_type,
    niche: typeof body.niche === "string" ? body.niche : "",
    snippet:
      typeof body.snippet === "string" ? body.snippet.slice(0, 600) : "",
    generated_at:
      typeof body.generated_at === "string"
        ? body.generated_at
        : new Date().toISOString(),
  };

  // Replace any prior rating for this run.
  const { error: delError } = await sb
    .from("brand_memory")
    .delete()
    .eq("user_id", userId)
    .eq("kind", "rated_output")
    .filter("value->>run_id", "eq", body.run_id);

  if (delError) {
    return jsonResponse(
      { error: `Failed to clear prior rating: ${delError.message}` },
      500
    );
  }

  const weight =
    body.rating === "favorite" ? 3 : body.rating === "successful" ? 2 : 1;

  const { data, error } = await sb
    .from("brand_memory")
    .insert({
      user_id: userId,
      kind: "rated_output",
      value,
      weight,
    })
    .select("id, created_at")
    .single<{ id: string; created_at: string }>();

  if (error) {
    return jsonResponse(
      { error: `Failed to record rating: ${error.message}` },
      500
    );
  }

  return jsonResponse({
    id: data.id,
    created_at: data.created_at,
    value,
    weight,
  });
}

/**
 * DELETE /api/ai/feedback?run_id=...
 * Removes the rating for a specific run.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { sb, userId } = auth;

  const url = new URL(req.url);
  const runId = url.searchParams.get("run_id");
  if (!runId) {
    return jsonResponse({ error: "Missing run_id" }, 400);
  }

  const { error } = await sb
    .from("brand_memory")
    .delete()
    .eq("user_id", userId)
    .eq("kind", "rated_output")
    .filter("value->>run_id", "eq", runId);

  if (error) {
    return jsonResponse(
      { error: `Failed to clear rating: ${error.message}` },
      500
    );
  }

  return jsonResponse({ ok: true });
}
