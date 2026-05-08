import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { upsertProviderSettings } from "@/lib/ai/aiSettingsRepository";
import { isProviderId } from "@/lib/ai/providers/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
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
    enabled?: boolean;
    default_model?: string | null;
  } | null;
  if (!body || !isProviderId(body.provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const patch: {
    enabled?: boolean;
    default_model?: string | null;
  } = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (
    typeof body.default_model === "string" ||
    body.default_model === null
  ) {
    patch.default_model = body.default_model;
  }

  const row = await upsertProviderSettings(sb, user.id, body.provider, patch);
  if (!row) {
    return NextResponse.json(
      { error: "Failed to update provider settings" },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, settings: row });
}
