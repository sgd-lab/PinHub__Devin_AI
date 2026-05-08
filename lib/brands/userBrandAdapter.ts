import type { BrandProfile } from "./brandSchema";
import type {
  BrandMemoryEntry,
  UserPreferences,
  UserProfile,
} from "@/lib/auth/types";

const ROTATION_DAYS_BY_INDEX: Array<
  "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
> = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function rotationDaysForIndex(
  index: number,
  total: number
): Array<"Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"> {
  if (total <= 0) return [];
  // Distribute days roughly evenly across the requested niches.
  const slots: Array<typeof ROTATION_DAYS_BY_INDEX[number]> = [];
  for (let i = 0; i < ROTATION_DAYS_BY_INDEX.length; i++) {
    if (i % total === index) slots.push(ROTATION_DAYS_BY_INDEX[i]);
  }
  return slots;
}

/**
 * Synthesize a BrandProfile (the shape consumed by the existing prompt
 * studio + execution pipeline) from per-user personalization data.
 *
 * This is the bridge between the new user_profiles / brand_memory /
 * user_preferences tables and the legacy BrandProfile schema, so that the
 * generation pipeline keeps working unchanged.
 */
export function buildBrandProfileFromUser(
  profile: UserProfile,
  prefs: UserPreferences | null,
  memory: BrandMemoryEntry[] = []
): BrandProfile {
  const allNiches = [
    profile.main_niche,
    ...profile.sub_niches,
  ]
    .filter((n): n is string => Boolean(n && n.trim()))
    .map((n) => n.trim());

  const palette =
    profile.brand_colors && profile.brand_colors.length > 0
      ? profile.brand_colors.map((c) => ({
          name: c.name || c.hex,
          hex: c.hex,
        }))
      : [{ name: "Default", hex: "#3E2723" }];

  // Pull memory rows by kind so we can layer them on top of preferences.
  const memoryByKind = new Map<string, BrandMemoryEntry[]>();
  for (const m of memory) {
    const list = memoryByKind.get(m.kind) ?? [];
    list.push(m);
    memoryByKind.set(m.kind, list);
  }

  const memoryStrings = (kind: string): string[] =>
    (memoryByKind.get(kind) ?? [])
      .map((m) =>
        typeof m.value === "string"
          ? m.value
          : (m.value as { text?: string })?.text ?? ""
      )
      .filter(Boolean);

  const tone = prefs?.creator_tone ||
    memoryStrings("tone")[0] ||
    "Considered, intentional, warm.";

  const favoriteStyles = [
    ...(prefs?.favorite_styles ?? []),
    ...memoryStrings("favorite_style"),
  ];
  const hookStyles = [
    ...(prefs?.preferred_hook_styles ?? []),
    ...memoryStrings("hook_style"),
  ];
  const signatureOpeners = prefs?.signature_openers ?? [];
  const powerWords = prefs?.power_words ?? favoriteStyles.slice(0, 8);
  const forbiddenWords = [
    ...(prefs?.forbidden_words ?? []),
    ...memoryStrings("forbidden"),
  ];

  const niches: BrandProfile["niches"] = allNiches.map((name, idx) => ({
    id: `niche-${slugify(name) || idx.toString()}`,
    name,
    hook: idx === 0 ? `Lead with ${name.toLowerCase()}` : `Companion: ${name}`,
    audience: prefs?.audience_address || "you",
    emotional_targets: favoriteStyles.slice(0, 3),
    hero_pieces: [],
    color_story: palette.slice(0, 3).map((p) => p.hex),
    keywords: favoriteStyles,
    forbidden: forbiddenWords,
    content_pillars: hookStyles,
    monetization_horizon: "",
    seasonal_weighting: "year-round",
    rotation_days: rotationDaysForIndex(idx, Math.max(1, allNiches.length)),
  }));

  const forbiddenPerNiche: Record<string, string[]> = {};
  for (const niche of niches) {
    forbiddenPerNiche[niche.name] = forbiddenWords;
  }

  const now = new Date().toISOString();
  const brandName = profile.brand_name?.trim() || profile.display_name?.trim() || "My Brand";

  return {
    schema_version: "v2026.1",
    id: `user-${profile.user_id}`,
    created_at: profile.created_at ?? now,
    updated_at: profile.updated_at ?? now,
    identity: {
      name: brandName,
      tagline: profile.tagline?.trim() || "",
      one_word: favoriteStyles[0] ?? "Intentional",
      mission_statement: profile.tagline?.trim() || "",
      operator_name: profile.display_name?.trim() || "",
      primary_market: profile.primary_market ?? "US, CA, UK",
    },
    visual_system: {
      palette,
      typography: {
        headline: "Playfair Display",
        body: "Inter",
      },
      keywords: favoriteStyles,
      never: forbiddenWords,
      moodboard_images: [],
    },
    voice: {
      register: tone,
      audience_address: prefs?.audience_address || "you",
      sentence_rules: "Short, declarative. End with periods.",
      forbidden_per_niche: forbiddenPerNiche,
      signature_openers: signatureOpeners,
      power_words: powerWords,
      emotional_arcs: {},
    },
    model_persona: {
      hair: "",
      eyes: "",
      skin: "",
      height_build: "",
      distinguishing: "",
      accessories: [],
      style_philosophy: "",
      reference_images: [],
      seasonal_shifts: {},
      nano_banana_face_reference: "",
    },
    niches,
    pinterest: {
      profile_name: brandName,
      bio: profile.tagline?.trim() || "",
      url: "",
      boards: niches.map((n) => ({
        name: n.name,
        description: n.hook,
        cover_color: n.color_story[0] ?? palette[0]?.hex ?? "#3E2723",
      })),
      default_hashtags: [],
      posting_frequency: "daily",
    },
    file_naming: {
      template: "{brand}-{niche}-{item}-{date}.jpg",
    },
    seo: {
      primary_keywords_per_niche: Object.fromEntries(
        niches.map((n) => [n.name, n.keywords])
      ),
      longtail_bank: [],
      competitor_boards: [],
    },
  };
}
