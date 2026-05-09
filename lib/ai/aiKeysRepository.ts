import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptApiKey, keyHint } from "@/lib/auth/keyCrypto";
import type { ProviderId } from "./providers/types";

export interface ApiKeyStatusRow {
  provider: ProviderId;
  key_hint: string | null;
  is_valid: boolean;
  last_validated_at: string | null;
}

/**
 * Returns lightweight metadata about each stored key for the given user.
 * Never includes the encrypted ciphertext.
 */
export async function listUserKeyStatuses(
  sb: SupabaseClient,
  userId: string
): Promise<ApiKeyStatusRow[]> {
  const { data, error } = await sb
    .from("user_api_keys")
    .select("provider, key_hint, is_valid, last_validated_at")
    .eq("user_id", userId)
    .returns<ApiKeyStatusRow[]>();
  if (error) return [];
  return data ?? [];
}

export async function upsertUserKey(
  sb: SupabaseClient,
  userId: string,
  provider: ProviderId,
  plaintextKey: string,
  metadata?: Record<string, unknown> | null
): Promise<{ ok: boolean; hint: string }> {
  const enc = encryptApiKey(plaintextKey);
  const hint = keyHint(plaintextKey);
  const { error } = await sb.from("user_api_keys").upsert(
    {
      user_id: userId,
      provider,
      encrypted_key: enc.encrypted_key,
      iv: enc.iv,
      auth_tag: enc.auth_tag,
      key_hint: hint,
      is_valid: true,
      last_validated_at: new Date().toISOString(),
      metadata: metadata ?? {},
    },
    { onConflict: "user_id,provider" }
  );
  return { ok: !error, hint };
}

/**
 * Returns provider metadata (e.g. Cloudflare account_id) so the API Keys UI
 * can pre-fill the metadata fields when the user opens an existing key.
 * Never returns the encrypted ciphertext or plaintext.
 */
export async function getUserKeyMetadata(
  sb: SupabaseClient,
  userId: string,
  provider: ProviderId
): Promise<Record<string, unknown> | null> {
  const { data } = await sb
    .from("user_api_keys")
    .select("metadata")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle<{ metadata: Record<string, unknown> | null }>();
  if (!data) return null;
  return data.metadata ?? {};
}

export async function deleteUserKey(
  sb: SupabaseClient,
  userId: string,
  provider: ProviderId
): Promise<boolean> {
  const { error } = await sb
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) return false;
  // Disable the provider when its key is removed.
  await sb
    .from("ai_provider_settings")
    .upsert(
      {
        user_id: userId,
        provider,
        enabled: false,
      },
      { onConflict: "user_id,provider" }
    );
  return true;
}

export async function markKeyValidated(
  sb: SupabaseClient,
  userId: string,
  provider: ProviderId,
  isValid: boolean
) {
  await sb
    .from("user_api_keys")
    .update({
      is_valid: isValid,
      last_validated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", provider);
}
