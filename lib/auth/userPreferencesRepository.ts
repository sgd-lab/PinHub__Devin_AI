"use client";

import { getSupabaseBrowserClient } from "@/lib/db/supabase";
import {
  EMPTY_PREFERENCES,
  type UserPreferences,
} from "./types";

interface PrefRow {
  user_id: string;
  creator_tone: string | null;
  favorite_styles: string[] | null;
  preferred_hook_styles: string[] | null;
  signature_openers: string[] | null;
  power_words: string[] | null;
  forbidden_words: string[] | null;
  audience_address: string | null;
  default_provider: string | null;
  default_temperature: number | null;
  selected_outputs: Record<string, unknown>[] | null;
  rejected_outputs: Record<string, unknown>[] | null;
  created_at: string | null;
  updated_at: string | null;
}

function rowToPrefs(row: PrefRow): UserPreferences {
  return {
    user_id: row.user_id,
    creator_tone: row.creator_tone,
    favorite_styles: row.favorite_styles ?? [],
    preferred_hook_styles: row.preferred_hook_styles ?? [],
    signature_openers: row.signature_openers ?? [],
    power_words: row.power_words ?? [],
    forbidden_words: row.forbidden_words ?? [],
    audience_address: row.audience_address,
    default_provider: row.default_provider,
    default_temperature:
      row.default_temperature ?? EMPTY_PREFERENCES.default_temperature,
    selected_outputs: row.selected_outputs ?? [],
    rejected_outputs: row.rejected_outputs ?? [],
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function fetchUserPreferences(
  userId: string
): Promise<UserPreferences | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<PrefRow>();

  if (error) {
    console.error("[userPreferencesRepository] fetch error", error);
    return null;
  }
  if (!data) return null;
  return rowToPrefs(data);
}

export async function upsertUserPreferences(
  prefs: Partial<UserPreferences> & { user_id: string }
): Promise<UserPreferences | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;

  const payload = {
    user_id: prefs.user_id,
    creator_tone: prefs.creator_tone ?? null,
    favorite_styles: prefs.favorite_styles ?? [],
    preferred_hook_styles: prefs.preferred_hook_styles ?? [],
    signature_openers: prefs.signature_openers ?? [],
    power_words: prefs.power_words ?? [],
    forbidden_words: prefs.forbidden_words ?? [],
    audience_address: prefs.audience_address ?? null,
    default_provider: prefs.default_provider ?? null,
    default_temperature:
      prefs.default_temperature ?? EMPTY_PREFERENCES.default_temperature,
    selected_outputs: prefs.selected_outputs ?? [],
    rejected_outputs: prefs.rejected_outputs ?? [],
  };

  const { data, error } = await sb
    .from("user_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single<PrefRow>();

  if (error) {
    console.error("[userPreferencesRepository] upsert error", error);
    return null;
  }
  return rowToPrefs(data);
}

const MAX_OUTPUT_HISTORY = 50;

export async function recordSelectedOutput(
  userId: string,
  output: Record<string, unknown>
): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return;
  const current = await fetchUserPreferences(userId);
  const next = [
    { ...output, recorded_at: new Date().toISOString() },
    ...(current?.selected_outputs ?? []),
  ].slice(0, MAX_OUTPUT_HISTORY);
  await upsertUserPreferences({ user_id: userId, selected_outputs: next });
}

export async function recordRejectedOutput(
  userId: string,
  output: Record<string, unknown>
): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return;
  const current = await fetchUserPreferences(userId);
  const next = [
    { ...output, recorded_at: new Date().toISOString() },
    ...(current?.rejected_outputs ?? []),
  ].slice(0, MAX_OUTPUT_HISTORY);
  await upsertUserPreferences({ user_id: userId, rejected_outputs: next });
}
