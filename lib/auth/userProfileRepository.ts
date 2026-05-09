"use client";

import { getSupabaseBrowserClient } from "@/lib/db/supabase";
import {
  EMPTY_PROFILE,
  type BrandColor,
  type UserProfile,
} from "./types";

interface ProfileRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  brand_name: string | null;
  tagline: string | null;
  main_niche: string | null;
  sub_niches: string[] | null;
  brand_colors: BrandColor[] | null;
  primary_market: string | null;
  onboarding_completed: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    user_id: row.user_id,
    email: row.email,
    display_name: row.display_name,
    brand_name: row.brand_name,
    tagline: row.tagline,
    main_niche: row.main_niche,
    sub_niches: row.sub_niches ?? [],
    brand_colors: row.brand_colors ?? [],
    primary_market: row.primary_market ?? EMPTY_PROFILE.primary_market,
    onboarding_completed: row.onboarding_completed ?? false,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function fetchUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.error("[userProfileRepository] fetch error", error);
    return null;
  }
  if (!data) return null;
  return rowToProfile(data);
}

export async function upsertUserProfile(
  profile: Partial<UserProfile> & { user_id: string }
): Promise<UserProfile | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;

  const payload = {
    user_id: profile.user_id,
    email: profile.email ?? null,
    display_name: profile.display_name ?? null,
    brand_name: profile.brand_name ?? null,
    tagline: profile.tagline ?? null,
    main_niche: profile.main_niche ?? null,
    sub_niches: profile.sub_niches ?? [],
    brand_colors: profile.brand_colors ?? [],
    primary_market: profile.primary_market ?? "US, CA, UK",
    onboarding_completed: profile.onboarding_completed ?? false,
  };

  const { data, error } = await sb
    .from("user_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single<ProfileRow>();

  if (error) {
    console.error("[userProfileRepository] upsert error", error);
    return null;
  }
  return rowToProfile(data);
}

export async function markOnboardingComplete(
  userId: string
): Promise<boolean> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return false;

  const { error } = await sb
    .from("user_profiles")
    .update({ onboarding_completed: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[userProfileRepository] markOnboardingComplete", error);
    return false;
  }
  return true;
}
