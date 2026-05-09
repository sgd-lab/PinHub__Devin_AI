import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { decryptApiKey } from "@/lib/auth/keyCrypto";
import { upsertProviderSettings } from "@/lib/ai/aiSettingsRepository";
import { listProviderModels } from "@/lib/ai/providers/openaiCompat";
import { PROVIDERS, isProviderId } from "@/lib/ai/providers/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 30 * 60 * 1000;

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
  const providerId = searchParams.get("provider");
  const force = searchParams.get("force") === "true";
  if (!isProviderId(providerId)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const { data: keyRow } = await sb
    .from("user_api_keys")
    .select("encrypted_key, iv, auth_tag")
    .eq("user_id", user.id)
    .eq("provider", providerId)
    .maybeSingle<{
      encrypted_key: string;
      iv: string;
      auth_tag: string;
    }>();

  if (!keyRow) {
    return NextResponse.json(
      { error: "No key configured for this provider" },
      { status: 404 }
    );
  }

  const { data: settingsRow } = await sb
    .from("ai_provider_settings")
    .select("available_models, models_fetched_at")
    .eq("user_id", user.id)
    .eq("provider", providerId)
    .maybeSingle<{
      available_models: { id: string; name: string }[];
      models_fetched_at: string | null;
    }>();

  if (!force && settingsRow?.models_fetched_at) {
    const ts = new Date(settingsRow.models_fetched_at).getTime();
    if (Date.now() - ts < CACHE_TTL_MS) {
      return NextResponse.json({
        provider: providerId,
        models: settingsRow.available_models ?? [],
        cached: true,
      });
    }
  }

  let plaintext: string;
  try {
    plaintext = decryptApiKey({
      encrypted_key: keyRow.encrypted_key,
      iv: keyRow.iv,
      auth_tag: keyRow.auth_tag,
    });
  } catch {
    return NextResponse.json(
      { error: "Stored key could not be decrypted" },
      { status: 500 }
    );
  }

  const models = await listProviderModels(PROVIDERS[providerId], plaintext);
  await upsertProviderSettings(sb, user.id, providerId, {
    available_models: models,
    models_fetched_at: new Date().toISOString(),
  });
  return NextResponse.json({ provider: providerId, models, cached: false });
}
