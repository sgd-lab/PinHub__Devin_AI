// Personalization data shapes used across the app. These intentionally mirror
// the shape of the rows in supabase/migrations/0001_user_personalization.sql.

export interface BrandColor {
  name: string;
  hex: string;
}

export interface UserProfile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  brand_name: string | null;
  tagline: string | null;
  main_niche: string | null;
  sub_niches: string[];
  brand_colors: BrandColor[];
  primary_market: string | null;
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export type BrandMemoryKind =
  | "tone"
  | "favorite_style"
  | "selected_output"
  | "rejected_output"
  | "hook_style"
  | "keyword"
  | "forbidden";

export interface BrandMemoryEntry {
  id: string;
  user_id: string;
  kind: BrandMemoryKind;
  value: Record<string, unknown> | string | number | boolean | unknown[];
  weight: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferences {
  user_id: string;
  creator_tone: string | null;
  favorite_styles: string[];
  preferred_hook_styles: string[];
  signature_openers: string[];
  power_words: string[];
  forbidden_words: string[];
  audience_address: string | null;
  default_provider: string | null;
  default_temperature: number;
  selected_outputs: Record<string, unknown>[];
  rejected_outputs: Record<string, unknown>[];
  created_at?: string;
  updated_at?: string;
}

export const EMPTY_PROFILE: Omit<UserProfile, "user_id"> = {
  email: null,
  display_name: null,
  brand_name: null,
  tagline: null,
  main_niche: null,
  sub_niches: [],
  brand_colors: [],
  primary_market: "US, CA, UK",
  onboarding_completed: false,
};

export const EMPTY_PREFERENCES: Omit<UserPreferences, "user_id"> = {
  creator_tone: null,
  favorite_styles: [],
  preferred_hook_styles: [],
  signature_openers: [],
  power_words: [],
  forbidden_words: [],
  audience_address: null,
  default_provider: null,
  default_temperature: 0.7,
  selected_outputs: [],
  rejected_outputs: [],
};
