import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptApiKey } from "@/lib/auth/keyCrypto";
import {
  PROVIDERS,
  isProviderId,
  type AITaskKind,
  type ChatChunk,
  type ChatMessage,
  type ProviderId,
} from "./providers/types";
import { streamProviderChat } from "./providers/openaiCompat";

interface ResolvedProvider {
  provider: ProviderId;
  model: string;
  apiKey: string;
  metadata: Record<string, unknown> | null;
}

export interface ResolvedTaskInfo {
  task: AITaskKind;
  primary: { provider: ProviderId; model: string } | null;
  fallback: { provider: ProviderId; model: string } | null;
  /** Why no provider could be resolved at all. */
  reason?: "no_keys" | "no_enabled_provider" | "ok";
}

interface PreferenceRow {
  task: AITaskKind;
  provider: string;
  model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
}

interface KeyRow {
  provider: string;
  encrypted_key: string;
  iv: string;
  auth_tag: string;
  metadata: Record<string, unknown> | null;
}

interface LoadedKey {
  apiKey: string;
  metadata: Record<string, unknown> | null;
}

interface SettingsRow {
  provider: string;
  enabled: boolean;
  default_model: string | null;
}

async function loadKey(
  sb: SupabaseClient,
  userId: string,
  provider: ProviderId
): Promise<LoadedKey | null> {
  const { data, error } = await sb
    .from("user_api_keys")
    .select("provider, encrypted_key, iv, auth_tag, metadata")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle<KeyRow>();
  if (error || !data) return null;
  try {
    const apiKey = decryptApiKey({
      encrypted_key: data.encrypted_key,
      iv: data.iv,
      auth_tag: data.auth_tag,
    });
    return {
      apiKey,
      metadata:
        data.metadata && typeof data.metadata === "object"
          ? data.metadata
          : null,
    };
  } catch {
    return null;
  }
}

async function pickFallback(
  sb: SupabaseClient,
  userId: string
): Promise<{ provider: ProviderId; model: string } | null> {
  const { data } = await sb
    .from("ai_provider_settings")
    .select("provider, enabled, default_model")
    .eq("user_id", userId)
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .returns<SettingsRow[]>();
  for (const row of data ?? []) {
    if (!isProviderId(row.provider)) continue;
    const model = row.default_model ?? PROVIDERS[row.provider].fallback_default_model;
    return { provider: row.provider, model };
  }
  return null;
}

async function resolvePrimary(
  sb: SupabaseClient,
  userId: string,
  task: AITaskKind
): Promise<ResolvedProvider | null> {
  const { data: pref } = await sb
    .from("user_model_preferences")
    .select("task, provider, model, fallback_provider, fallback_model")
    .eq("user_id", userId)
    .eq("task", task)
    .maybeSingle<PreferenceRow>();

  if (pref && isProviderId(pref.provider)) {
    const loaded = await loadKey(sb, userId, pref.provider);
    if (loaded) {
      return {
        provider: pref.provider,
        model: pref.model,
        apiKey: loaded.apiKey,
        metadata: loaded.metadata,
      };
    }
  }

  const fallback = await pickFallback(sb, userId);
  if (!fallback) return null;
  const loaded = await loadKey(sb, userId, fallback.provider);
  if (!loaded) return null;
  return {
    provider: fallback.provider,
    model: fallback.model,
    apiKey: loaded.apiKey,
    metadata: loaded.metadata,
  };
}

/**
 * Returns what the chat route *would* pick for this task right now, without
 * decrypting any keys or running a generation. Used by the generator UIs to
 * display an accurate "Will use: <provider> · <model>" badge.
 */
export async function describeResolution(
  sb: SupabaseClient,
  userId: string,
  task: AITaskKind
): Promise<ResolvedTaskInfo> {
  const [{ data: pref }, { data: enabledRows }, { data: keyRows }] =
    await Promise.all([
      sb
        .from("user_model_preferences")
        .select("task, provider, model, fallback_provider, fallback_model")
        .eq("user_id", userId)
        .eq("task", task)
        .maybeSingle<PreferenceRow>(),
      sb
        .from("ai_provider_settings")
        .select("provider, enabled, default_model")
        .eq("user_id", userId)
        .eq("enabled", true)
        .order("updated_at", { ascending: false })
        .returns<SettingsRow[]>(),
      sb
        .from("user_api_keys")
        .select("provider")
        .eq("user_id", userId)
        .returns<{ provider: string }[]>(),
    ]);

  const haveKey = new Set(
    (keyRows ?? []).map((r) => r.provider).filter(isProviderId)
  );

  if (haveKey.size === 0) {
    return { task, primary: null, fallback: null, reason: "no_keys" };
  }

  let primary: { provider: ProviderId; model: string } | null = null;
  if (pref && isProviderId(pref.provider) && haveKey.has(pref.provider)) {
    primary = { provider: pref.provider, model: pref.model };
  } else {
    for (const row of enabledRows ?? []) {
      if (!isProviderId(row.provider)) continue;
      if (!haveKey.has(row.provider)) continue;
      primary = {
        provider: row.provider,
        model:
          row.default_model ?? PROVIDERS[row.provider].fallback_default_model,
      };
      break;
    }
  }

  if (!primary) {
    return { task, primary: null, fallback: null, reason: "no_enabled_provider" };
  }

  let fallback: { provider: ProviderId; model: string } | null = null;
  if (
    pref?.fallback_provider &&
    pref.fallback_model &&
    isProviderId(pref.fallback_provider) &&
    pref.fallback_provider !== primary.provider &&
    haveKey.has(pref.fallback_provider)
  ) {
    fallback = {
      provider: pref.fallback_provider,
      model: pref.fallback_model,
    };
  } else {
    for (const row of enabledRows ?? []) {
      if (!isProviderId(row.provider)) continue;
      if (!haveKey.has(row.provider)) continue;
      if (row.provider === primary.provider) continue;
      fallback = {
        provider: row.provider,
        model:
          row.default_model ?? PROVIDERS[row.provider].fallback_default_model,
      };
      break;
    }
  }

  return { task, primary, fallback, reason: "ok" };
}

async function resolveBackup(
  sb: SupabaseClient,
  userId: string,
  task: AITaskKind,
  excludeProvider: ProviderId
): Promise<ResolvedProvider | null> {
  const { data: pref } = await sb
    .from("user_model_preferences")
    .select("task, provider, model, fallback_provider, fallback_model")
    .eq("user_id", userId)
    .eq("task", task)
    .maybeSingle<PreferenceRow>();

  if (
    pref &&
    pref.fallback_provider &&
    pref.fallback_model &&
    isProviderId(pref.fallback_provider) &&
    pref.fallback_provider !== excludeProvider
  ) {
    const loaded = await loadKey(sb, userId, pref.fallback_provider);
    if (loaded) {
      return {
        provider: pref.fallback_provider,
        model: pref.fallback_model,
        apiKey: loaded.apiKey,
        metadata: loaded.metadata,
      };
    }
  }

  const fallback = await pickFallback(sb, userId);
  if (!fallback || fallback.provider === excludeProvider) return null;
  const loaded = await loadKey(sb, userId, fallback.provider);
  if (!loaded) return null;
  return {
    provider: fallback.provider,
    model: fallback.model,
    apiKey: loaded.apiKey,
    metadata: loaded.metadata,
  };
}

async function markKeyInvalid(
  sb: SupabaseClient,
  userId: string,
  provider: ProviderId
) {
  await sb
    .from("user_api_keys")
    .update({ is_valid: false, last_validated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", provider);
}

export interface RunChatArgs {
  sb: SupabaseClient;
  userId: string;
  task: AITaskKind;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
}

/**
 * Resolve user's provider+model preferences for a task, then stream chat.
 * Yields a provider-prefix `meta` chunk first, then ChatChunks.
 *
 * If the primary provider returns invalid_key/unsupported_model/timeout,
 * we attempt a single fallback (per the user's preference, or the next
 * enabled provider).
 */
export async function* runChatStream(
  args: RunChatArgs
): AsyncGenerator<
  | ChatChunk
  | {
      type: "meta";
      provider: ProviderId;
      model: string;
      attempt: "primary" | "fallback";
    },
  void,
  unknown
> {
  const primary = await resolvePrimary(args.sb, args.userId, args.task);
  if (!primary) {
    yield {
      type: "error",
      message:
        "No usable AI provider configured. Add a key in Settings → API Keys.",
      code: "no_provider",
    };
    yield { type: "done" };
    return;
  }

  yield {
    type: "meta",
    provider: primary.provider,
    model: primary.model,
    attempt: "primary",
  };

  let primaryFailedRecoverable = false;
  let primaryErrorChunk: ChatChunk | null = null;

  for await (const chunk of streamProviderChat(PROVIDERS[primary.provider], {
    apiKey: primary.apiKey,
    model: primary.model,
    messages: args.messages,
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    signal: args.signal,
    metadata: primary.metadata,
  })) {
    if (chunk.type === "error") {
      primaryErrorChunk = chunk;
      const code = chunk.code ?? "";
      if (
        code === "invalid_key" ||
        code === "unsupported_model" ||
        code === "timeout" ||
        code === "provider_error" ||
        code === "network_error"
      ) {
        primaryFailedRecoverable = true;
      }
      if (code === "invalid_key") {
        await markKeyInvalid(args.sb, args.userId, primary.provider);
      }
      break;
    }
    yield chunk;
    if (chunk.type === "done") return;
  }

  if (!primaryFailedRecoverable) {
    if (primaryErrorChunk) {
      yield primaryErrorChunk;
      yield { type: "done" };
    }
    return;
  }

  const backup = await resolveBackup(
    args.sb,
    args.userId,
    args.task,
    primary.provider
  );
  if (!backup) {
    if (primaryErrorChunk) yield primaryErrorChunk;
    yield { type: "done" };
    return;
  }

  yield {
    type: "meta",
    provider: backup.provider,
    model: backup.model,
    attempt: "fallback",
  };

  for await (const chunk of streamProviderChat(PROVIDERS[backup.provider], {
    apiKey: backup.apiKey,
    model: backup.model,
    messages: args.messages,
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    signal: args.signal,
    metadata: backup.metadata,
  })) {
    if (chunk.type === "error" && chunk.code === "invalid_key") {
      await markKeyInvalid(args.sb, args.userId, backup.provider);
    }
    yield chunk;
    if (chunk.type === "done") return;
  }
}
