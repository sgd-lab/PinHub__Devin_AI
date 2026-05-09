import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { PROVIDERS, isProviderId } from "@/lib/ai/providers/types";
import { validateProviderKey } from "@/lib/ai/providers/openaiCompat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
    provider?: string;
    api_key?: string;
    metadata?: Record<string, unknown>;
  } | null;
  if (
    !body ||
    !isProviderId(body.provider) ||
    typeof body.api_key !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid request: { provider, api_key, metadata? }" },
      { status: 400 }
    );
  }

  const provider = PROVIDERS[body.provider];
  const metadata =
    body.metadata && typeof body.metadata === "object" ? body.metadata : null;
  const result = await validateProviderKey(
    provider,
    body.api_key.trim(),
    metadata
  );
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Invalid key" },
      { status: 200 }
    );
  }
  return NextResponse.json({
    ok: true,
    models_count: result.models?.length ?? 0,
  });
}
