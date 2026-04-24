export interface QCRule {
  id: string;
  rule_type:
    | "char_max"
    | "char_min"
    | "contains_any"
    | "contains_all"
    | "contains_none"
    | "regex"
    | "word_count_range";
  target_field: "title" | "description" | "hashtags" | "prompt_a" | "prompt_b";
  params: Record<string, unknown>;
  severity: "hard_fail" | "warn" | "soft_check";
  message: string;
  fix_hint?: string;
}

export const DEFAULT_QC_RULES: QCRule[] = [
  {
    id: "title-max-chars",
    rule_type: "char_max",
    target_field: "title",
    params: { max: 100 },
    severity: "hard_fail",
    message: "Title must be 100 characters or fewer",
    fix_hint: "Consider removing adjectives or shortening phrases",
  },
  {
    id: "title-has-niche-keywords",
    rule_type: "contains_any",
    target_field: "title",
    params: { values_ref: "niche.keywords" },
    severity: "warn",
    message: "Title should contain at least one niche keyword",
  },
  {
    id: "title-no-forbidden",
    rule_type: "contains_none",
    target_field: "title",
    params: { values_ref: "brand.forbidden" },
    severity: "hard_fail",
    message: "Title contains forbidden brand words",
  },
  {
    id: "title-no-question-mark",
    rule_type: "regex",
    target_field: "title",
    params: { pattern: "\\?$", negate: true },
    severity: "warn",
    message: "Title should not end with a question mark",
  },
  {
    id: "title-no-all-caps",
    rule_type: "regex",
    target_field: "title",
    params: { pattern: "\\b[A-Z]{4,}\\b", negate: true },
    severity: "warn",
    message: "Title should not contain ALL CAPS words",
  },
  {
    id: "desc-max-chars",
    rule_type: "char_max",
    target_field: "description",
    params: { max: 800 },
    severity: "hard_fail",
    message: "Description must be 800 characters or fewer",
  },
  {
    id: "desc-has-hashtags",
    rule_type: "regex",
    target_field: "description",
    params: { pattern: "#\\w+.*#\\w+", negate: false },
    severity: "warn",
    message: "Description should contain 2-4 hashtags",
  },
  {
    id: "desc-has-garment",
    rule_type: "contains_any",
    target_field: "description",
    params: {
      values: [
        "blazer", "blouse", "dress", "skirt", "trousers", "coat", "knit",
        "shirt", "pants", "jacket", "sweater", "top", "heel", "flat",
        "sandal", "bag", "clutch", "earring", "necklace", "ring",
      ],
    },
    severity: "warn",
    message: "Description should mention at least one garment or accessory",
  },
  {
    id: "desc-has-opener",
    rule_type: "contains_any",
    target_field: "description",
    params: { values_ref: "brand.signature_openers" },
    severity: "warn",
    message: "Description should use a brand signature opener",
  },
  {
    id: "desc-no-forbidden",
    rule_type: "contains_none",
    target_field: "description",
    params: { values_ref: "brand.forbidden" },
    severity: "hard_fail",
    message: "Description contains forbidden brand words",
  },
  {
    id: "desc-has-power-words",
    rule_type: "contains_any",
    target_field: "description",
    params: { values_ref: "brand.power_words" },
    severity: "soft_check",
    message: "Description should use brand power words",
  },
  {
    id: "hashtags-count",
    rule_type: "word_count_range",
    target_field: "hashtags",
    params: { min: 5, max: 15 },
    severity: "warn",
    message: "Hashtags should be between 5-15",
  },
  {
    id: "hashtags-no-banned",
    rule_type: "contains_none",
    target_field: "hashtags",
    params: { values: ["#followforfollow", "#f4f", "#likeforlike", "#spam"] },
    severity: "hard_fail",
    message: "Hashtags contain banned tags",
  },
  {
    id: "prompt-a-has-illustration",
    rule_type: "contains_any",
    target_field: "prompt_a",
    params: {
      values: [
        "illustration", "watercolor", "collage", "editorial",
        "fashion sketch", "mixed media",
      ],
    },
    severity: "warn",
    message: "Prompt A should reference illustration media",
  },
  {
    id: "prompt-a-has-palette",
    rule_type: "contains_any",
    target_field: "prompt_a",
    params: { values_ref: "brand.palette_names" },
    severity: "warn",
    message: "Prompt A should reference brand palette colors",
  },
  {
    id: "prompt-b-has-camera",
    rule_type: "contains_any",
    target_field: "prompt_b",
    params: {
      values: [
        "camera", "lens", "focal", "f/", "aperture", "depth of field",
        "35mm", "50mm", "85mm", "portrait", "wide angle",
      ],
    },
    severity: "warn",
    message: "Prompt B should reference camera/photography terms",
  },
  {
    id: "prompt-b-has-lighting",
    rule_type: "contains_any",
    target_field: "prompt_b",
    params: {
      values: [
        "lighting", "golden hour", "natural light", "soft light",
        "studio light", "backlit", "diffused", "warm light",
      ],
    },
    severity: "warn",
    message: "Prompt B should reference lighting terms",
  },
  {
    id: "prompt-b-no-forbidden",
    rule_type: "contains_none",
    target_field: "prompt_b",
    params: { values_ref: "brand.forbidden" },
    severity: "hard_fail",
    message: "Prompt B contains forbidden brand words",
  },
];
