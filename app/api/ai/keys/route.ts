import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import {
  deleteUserKey,
  listUserKeyStatuses,
  upsertUserKey,
} from "@/lib/ai/aiKeysRepository";
import { listProviderSettings } from "@/lib/ai/aiSettingsRepository";
import {
  PROVIDERS,
  isProviderId,
} from "@/lib/ai/providers/types";
import { validateProviderKey } from "@/lib/ai/providers/openaiCompat";
import { isCryptoConfigured } from "@/lib/auth/keyCrypto";

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
  const [keys, settings] = await Promise.all([
    listUserKeyStatuses(ctx.sb, ctx.user.id),
    listProviderSettings(ctx.sb, ctx.user.id),
  ]);
  return NextResponse.json({
    crypto_configured: isCryptoConfigured(),
    keys,
    settings,
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  if (!isCryptoConfigured()) {
    return NextResponse.json(
      {
        error:
          "PINHUB_KEY_ENC_SECRET is not configured on the server. Cannot encrypt API keys.",
      },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    provider?: string;
    api_key?: string;
  } | null;
  if (!body || !isProviderId(body.provider) || typeof body.api_key !== "string") {
    return NextResponse.json(
      { error: "Invalid request: { provider, api_key }" },
      { status: 400 }
    );
  }

  const trimmedKey = body.api_key.trim();
  if (trimmedKey.length < 8) {
    return NextResponse.json(
      { error: "API key looks too short" },
      { status: 400 }
    );
  }

  const provider = PROVIDERS[body.provider];
  const validation = await validateProviderKey(provider, trimmedKey);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: `Could not validate ${provider.label}: ${validation.error ?? "unknown error"}`,
      },
      { status: 400 }
    );
  }

  const result = await upsertUserKey(ctx.sb, ctx.user.id, body.provider, trimmedKey);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to store API key" },
      { status: 500 }
    );
  }

  // Make sure provider is enabled and has a default model.
  const fallbackModel =
    validation.models?.[0]?.id ?? provider.fallback_default_model;
  await ctx.sb.from("ai_provider_settings").upsert(
    {
      user_id: ctx.user.id,
      provider: body.provider,
      enabled: true,
      default_model: fallbackModel,
      available_models: validation.models ?? [],
      models_fetched_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  return NextResponse.json({
    ok: true,
    provider: body.provider,
    hint: result.hint,
    models_count: validation.models?.length ?? 0,
  });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");
  if (!isProviderId(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  const ok = await deleteUserKey(ctx.sb, ctx.user.id, provider);
  return NextResponse.json({ ok });
}
