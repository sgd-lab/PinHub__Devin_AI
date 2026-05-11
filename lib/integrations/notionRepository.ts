import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  encryptApiKey,
  decryptApiKey,
  type EncryptedPayload,
} from "@/lib/auth/keyCrypto";

export type IntegrationName = "notion";

export interface IntegrationStatus {
  integration: IntegrationName;
  connected: boolean;
  status: "connected" | "disconnected" | "invalid";
  token_hint: string | null;
  metadata: Record<string, unknown>;
  last_validated_at: string | null;
}

interface IntegrationRow {
  integration: IntegrationName;
  encrypted_token: string | null;
  iv: string | null;
  auth_tag: string | null;
  token_hint: string | null;
  metadata: Record<string, unknown> | null;
  status: "connected" | "disconnected" | "invalid";
  last_validated_at: string | null;
}

export async function getIntegrationStatus(
  sb: SupabaseClient,
  userId: string,
  integration: IntegrationName
): Promise<IntegrationStatus> {
  const { data } = await sb
    .from("user_integrations")
    .select(
      "integration,token_hint,metadata,status,last_validated_at,encrypted_token"
    )
    .eq("user_id", userId)
    .eq("integration", integration)
    .maybeSingle();

  if (!data) {
    return {
      integration,
      connected: false,
      status: "disconnected",
      token_hint: null,
      metadata: {},
      last_validated_at: null,
    };
  }

  return {
    integration,
    connected: data.status === "connected" && Boolean(data.encrypted_token),
    status: data.status,
    token_hint: data.token_hint ?? null,
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    last_validated_at: data.last_validated_at ?? null,
  };
}

export async function getDecryptedToken(
  sb: SupabaseClient,
  userId: string,
  integration: IntegrationName
): Promise<string | null> {
  const { data } = await sb
    .from("user_integrations")
    .select("encrypted_token,iv,auth_tag,status")
    .eq("user_id", userId)
    .eq("integration", integration)
    .maybeSingle<IntegrationRow>();

  if (!data || data.status !== "connected") return null;
  if (!data.encrypted_token || !data.iv || !data.auth_tag) return null;
  try {
    return decryptApiKey({
      encrypted_key: data.encrypted_token,
      iv: data.iv,
      auth_tag: data.auth_tag,
    });
  } catch {
    return null;
  }
}

export async function saveIntegrationToken(
  sb: SupabaseClient,
  userId: string,
  integration: IntegrationName,
  token: string,
  metadata: Record<string, unknown>
): Promise<{ ok: true; hint: string } | { ok: false; error: string }> {
  const trimmed = token.trim();
  if (trimmed.length < 8) {
    return { ok: false, error: "Token looks too short." };
  }

  let payload: EncryptedPayload;
  try {
    payload = encryptApiKey(trimmed);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to encrypt token.",
    };
  }

  const hint = `••••${trimmed.slice(-4)}`;

  const { error } = await sb
    .from("user_integrations")
    .upsert(
      {
        user_id: userId,
        integration,
        encrypted_token: payload.encrypted_key,
        iv: payload.iv,
        auth_tag: payload.auth_tag,
        token_hint: hint,
        metadata,
        status: "connected",
        last_validated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,integration" }
    );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, hint };
}

export async function disconnectIntegration(
  sb: SupabaseClient,
  userId: string,
  integration: IntegrationName
): Promise<void> {
  await sb
    .from("user_integrations")
    .delete()
    .eq("user_id", userId)
    .eq("integration", integration);
}
