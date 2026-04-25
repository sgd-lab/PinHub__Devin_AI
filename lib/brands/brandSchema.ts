import { z } from "zod";

export const BrandProfileSchema = z.object({
  schema_version: z.string().default("v2026.1"),
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  identity: z.object({
    name: z.string(),
    tagline: z.string(),
    one_word: z.string(),
    mission_statement: z.string(),
    operator_name: z.string(),
    logo_base64: z.string().optional(),
    favicon_base64: z.string().optional(),
    founding_date: z.string().optional(),
    primary_market: z.string(),
  }),
  visual_system: z.object({
    palette: z.array(z.object({ name: z.string(), hex: z.string() })),
    typography: z.object({
      headline: z.string(),
      body: z.string(),
      accent: z.string().optional(),
    }),
    keywords: z.array(z.string()),
    never: z.array(z.string()),
    moodboard_images: z.array(z.string()).max(12),
  }),
  voice: z.object({
    register: z.string(),
    audience_address: z.string(),
    sentence_rules: z.string(),
    forbidden_per_niche: z.record(z.string(), z.array(z.string())),
    signature_openers: z.array(z.string()),
    power_words: z.array(z.string()),
    emotional_arcs: z.record(z.string(), z.string()),
  }),
  model_persona: z.object({
    hair: z.string(),
    eyes: z.string(),
    skin: z.string(),
    height_build: z.string(),
    distinguishing: z.string(),
    accessories: z.array(z.string()),
    style_philosophy: z.string(),
    reference_images: z.array(z.string()),
    seasonal_shifts: z.record(z.string(), z.string()),
    nano_banana_face_reference: z.string(),
  }),
  niches: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      hook: z.string(),
      audience: z.string(),
      emotional_targets: z.array(z.string()),
      hero_pieces: z.array(z.string()),
      color_story: z.array(z.string()),
      keywords: z.array(z.string()),
      forbidden: z.array(z.string()),
      content_pillars: z.array(z.string()),
      monetization_horizon: z.string(),
      seasonal_weighting: z.string(),
      rotation_days: z.array(
        z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
      ),
    })
  ),
  pinterest: z.object({
    profile_name: z.string(),
    bio: z.string(),
    url: z.string(),
    boards: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        cover_color: z.string(),
      })
    ),
    default_hashtags: z.array(z.string()),
    posting_frequency: z.string(),
  }),
  file_naming: z.object({
    template: z.string(),
  }),
  seo: z.object({
    primary_keywords_per_niche: z.record(z.string(), z.array(z.string())),
    longtail_bank: z.array(z.string()),
    competitor_boards: z.array(z.string()),
  }),
});

export type BrandProfile = z.infer<typeof BrandProfileSchema>;
