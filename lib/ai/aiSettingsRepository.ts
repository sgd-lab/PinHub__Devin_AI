import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AITaskKind,
  ModelInfo,
  ProviderId,
} from "./providers/types";

export interface ProviderSettingsRow {
  provider: ProviderId;
  enabled: boolean;
  default_model: string | null;
  available_models: ModelInfo[];
  models_fetched_at: string | null;
}

export interface ModelPreferenceRow {
  task: AITaskKind;
  provider: ProviderId;
  model: string;
  fallback_provider: ProviderId | null;
  fallback_model: string | null;
}

export async function listProviderSettings(
  sb: SupabaseClient,
  userId: string
): Promise<ProviderSettingsRow[]> {
  const { data, error } = await sb
    .from("ai_provider_settings")
    .select(
      "provider, enabled, default_model, available_models, models_fetched_at"
    )
    .eq("user_id", userId)
    .returns<ProviderSettingsRow[]>();
  if (error || !data) return [];
  return data;
}

export async function upsertProviderSettings(
  sb: SupabaseClient,
  userId: string,
  provider: ProviderId,
  patch: {
    enabled?: boolean;
    default_model?: string | null;
    available_models?: ModelInfo[];
    models_fetched_at?: string | null;
  }
): Promise<ProviderSettingsRow | null> {
  const { data, error } = await sb
    .from("ai_provider_settings")
    .upsert(
      {
        user_id: userId,
        provider,
        ...patch,
      },
      { onConflict: "user_id,provider" }
    )
    .select(
      "provider, enabled, default_model, available_models, models_fetched_at"
    )
    .single<ProviderSettingsRow>();
  if (error) return null;
  return data ?? null;
}

export async function listModelPreferences(
  sb: SupabaseClient,
  userId: string
): Promise<ModelPreferenceRow[]> {
  const { data, error } = await sb
    .from("user_model_preferences")
    .select("task, provider, model, fallback_provider, fallback_model")
    .eq("user_id", userId)
    .returns<ModelPreferenceRow[]>();
  if (error || !data) return [];
  return data;
}

export async function upsertModelPreference(
  sb: SupabaseClient,
  userId: string,
  row: ModelPreferenceRow
): Promise<ModelPreferenceRow | null> {
  const { data, error } = await sb
    .from("user_model_preferences")
    .upsert(
      {
        user_id: userId,
        task: row.task,
        provider: row.provider,
        model: row.model,
        fallback_provider: row.fallback_provider,
        fallback_model: row.fallback_model,
      },
      { onConflict: "user_id,task" }
    )
    .select("task, provider, model, fallback_provider, fallback_model")
    .single<ModelPreferenceRow>();
  if (error) return null;
  return data ?? null;
}

export async function deleteModelPreference(
  sb: SupabaseClient,
  userId: string,
  task: AITaskKind
): Promise<boolean> {
  const { error } = await sb
    .from("user_model_preferences")
    .delete()
    .eq("user_id", userId)
    .eq("task", task);
  return !error;
}
