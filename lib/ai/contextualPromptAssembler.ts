import type { BrandProfile } from "@/lib/brands/brandSchema";
import type {
  BrandMemoryEntry,
  UserPreferences,
} from "@/lib/auth/types";

export type RunType = "single" | "daily" | "guide" | "mega" | "inspiration";
export type OutputRating = "successful" | "weak" | "favorite";

export interface RatedOutputSnapshot {
  rating: OutputRating;
  run_id: string;
  run_type: RunType;
  niche: string;
  snippet: string;
  generated_at: string;
}

export interface PersonalizationInputs {
  preferences: UserPreferences | null;
  memory: BrandMemoryEntry[];
}

export interface AssemblerInputs {
  brand: BrandProfile;
  runType: RunType;
  runtimeInputs: Record<string, string>;
  personalization?: PersonalizationInputs | null;
  /**
   * Output-type contract describing the exact sections the model must emit.
   * This is what the legacy inline `prompt_text` used to embed.
   */
  outputContract: string;
  /**
   * Optional caller intent override (e.g. "weekly guide for affiliate angle").
   * If omitted, the campaign layer is derived from runtimeInputs.
   */
  campaignIntent?: string;
  /**
   * Optional creator-authored master prompt for this task. When provided,
   * it's injected as a dedicated CREATOR'S MASTER PROMPT layer above the
   * OUTPUT TYPE so the brand voice and output contract still apply.
   */
  customUserPrompt?: string | null;
}

export interface AssembledLayers {
  baseBrand: string;
  campaign: string;
  outputType: string;
  emotionalModifier: string;
  feedbackSignal: string | null;
  customUserPrompt: string | null;
}

export interface AssembledPrompt {
  systemPrompt: string;
  userPrompt: string;
  layers: AssembledLayers;
  debugSummary: {
    used_personalization: boolean;
    used_custom_user_prompt: boolean;
    rated_outputs_used: {
      successful: number;
      favorite: number;
      weak: number;
    };
    layer_lengths: Record<keyof AssembledLayers, number>;
  };
}

const MAX_REFERENCE_SUCCESS = 3;
const MAX_REFERENCE_FAVORITE = 2;
const MAX_REFERENCE_WEAK = 2;
const MAX_SNIPPET_CHARS = 220;

function truncate(text: string, max = MAX_SNIPPET_CHARS): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function bullet(items: string[]): string {
  return items.filter(Boolean).map((s) => `- ${s}`).join("\n");
}

function section(title: string, body: string | null): string | null {
  const b = body?.trim();
  if (!b) return null;
  return `${title}\n${b}`;
}

function pickActiveNiche(
  brand: BrandProfile,
  runtimeNiche?: string
): BrandProfile["niches"][number] | undefined {
  if (!runtimeNiche || runtimeNiche === "auto") return brand.niches[0];
  const lower = runtimeNiche.toLowerCase();
  return (
    brand.niches.find(
      (n) =>
        n.id === runtimeNiche ||
        n.name.toLowerCase() === lower ||
        n.name.toLowerCase().includes(lower)
    ) ?? brand.niches[0]
  );
}

function buildBaseBrandLayer(brand: BrandProfile): string {
  const lines: string[] = [];
  if (brand.identity.name) lines.push(`Brand: ${brand.identity.name}`);
  if (brand.identity.tagline) lines.push(`Tagline: ${brand.identity.tagline}`);
  if (brand.identity.mission_statement)
    lines.push(`Mission: ${brand.identity.mission_statement}`);
  if (brand.identity.operator_name)
    lines.push(`Operator: ${brand.identity.operator_name}`);
  if (brand.identity.primary_market)
    lines.push(`Primary market: ${brand.identity.primary_market}`);

  const palette = brand.visual_system.palette
    .map((p) => `${p.name} (${p.hex})`)
    .join(", ");
  if (palette) lines.push(`Palette: ${palette}`);

  const visualKeywords = brand.visual_system.keywords.join(", ");
  if (visualKeywords) lines.push(`Visual direction: ${visualKeywords}`);

  const visualNever = brand.visual_system.never.join(", ");
  if (visualNever) lines.push(`Never visually: ${visualNever}`);

  if (brand.voice.register) lines.push(`Voice register: ${brand.voice.register}`);
  if (brand.voice.audience_address)
    lines.push(`Audience address: ${brand.voice.audience_address}`);
  if (brand.voice.sentence_rules)
    lines.push(`Sentence rules: ${brand.voice.sentence_rules}`);

  if (brand.niches.length > 0) {
    const niches = brand.niches
      .map((n) => `${n.name}${n.audience ? ` (for ${n.audience})` : ""}`)
      .join("; ");
    lines.push(`Niches: ${niches}`);
  }

  return [
    "## BASE BRAND",
    "Use this brand identity as the foundation for every line you write.",
    bullet(lines),
  ].join("\n");
}

function buildCampaignLayer(
  brand: BrandProfile,
  runType: RunType,
  runtimeInputs: Record<string, string>,
  campaignIntent?: string
): string {
  const niche = pickActiveNiche(brand, runtimeInputs.niche);
  const lines: string[] = [];

  if (campaignIntent) lines.push(`Intent: ${campaignIntent}`);
  else lines.push(`Intent: ${describeRunType(runType)}`);

  if (niche) {
    lines.push(`Active niche: ${niche.name}`);
    if (niche.hook) lines.push(`Niche hook: ${niche.hook}`);
    if (niche.keywords.length)
      lines.push(`Niche keywords: ${niche.keywords.slice(0, 8).join(", ")}`);
    if (niche.color_story.length)
      lines.push(`Niche color story: ${niche.color_story.slice(0, 4).join(", ")}`);
    if (niche.emotional_targets.length)
      lines.push(`Emotional targets: ${niche.emotional_targets.join(", ")}`);
    if (niche.forbidden.length)
      lines.push(`Niche forbidden: ${niche.forbidden.join(", ")}`);
  }

  for (const key of Object.keys(runtimeInputs)) {
    if (key === "niche") continue;
    const v = runtimeInputs[key];
    if (!v || !v.trim()) continue;
    lines.push(`${prettyKey(key)}: ${v}`);
  }

  return [
    "## CAMPAIGN",
    "Tailor this run to the campaign context below.",
    bullet(lines),
  ].join("\n");
}

function describeRunType(runType: RunType): string {
  switch (runType) {
    case "single":
      return "single Pinterest pin (one outfit / one concept) for the active niche";
    case "daily":
      return "daily 3-pin set (hero, detail, lifestyle) for the active niche";
    case "guide":
      return "long-form weekly Pinterest content guide with hook, story, concepts, hook lines, and CTA";
    case "mega":
      return "weeklong batch of pins + guide";
    case "inspiration":
      return "inspiration pin (mood / direction reference) — short, evocative, image-led concept for the active niche";
    default:
      return runType;
  }
}

function prettyKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildOutputTypeLayer(
  runType: RunType,
  outputContract: string
): string {
  return [
    "## OUTPUT TYPE",
    `Type: ${runType}`,
    "",
    outputContract.trim(),
  ].join("\n");
}

function buildEmotionalModifierLayer(
  brand: BrandProfile,
  preferences: UserPreferences | null,
  memory: BrandMemoryEntry[]
): string {
  const memoryByKind = new Map<string, BrandMemoryEntry[]>();
  for (const m of memory) {
    const list = memoryByKind.get(m.kind) ?? [];
    list.push(m);
    memoryByKind.set(m.kind, list);
  }

  function memVals(kind: string): string[] {
    return (memoryByKind.get(kind) ?? [])
      .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))
      .map((m) =>
        typeof m.value === "string"
          ? m.value
          : (m.value as { text?: string })?.text ?? ""
      )
      .filter(Boolean);
  }

  const lines: string[] = [];

  const tone =
    preferences?.creator_tone || memVals("tone")[0] || brand.voice.register;
  if (tone) lines.push(`Tone: ${tone}`);

  const favoriteStyles = [
    ...(preferences?.favorite_styles ?? []),
    ...memVals("favorite_style"),
  ].filter((v, i, a) => a.indexOf(v) === i);
  if (favoriteStyles.length)
    lines.push(`Favorite styles: ${favoriteStyles.slice(0, 8).join(", ")}`);

  const hookStyles = [
    ...(preferences?.preferred_hook_styles ?? []),
    ...memVals("hook_style"),
  ].filter((v, i, a) => a.indexOf(v) === i);
  if (hookStyles.length)
    lines.push(`Hook styles: ${hookStyles.slice(0, 6).join(", ")}`);

  const openers = preferences?.signature_openers ?? [];
  if (openers.length)
    lines.push(`Signature openers (vary, do not repeat verbatim): ${openers.join(" | ")}`);

  const power = preferences?.power_words ?? [];
  if (power.length) lines.push(`Power words to lean on: ${power.join(", ")}`);

  const forbidden = [
    ...(preferences?.forbidden_words ?? []),
    ...memVals("forbidden"),
  ].filter((v, i, a) => a.indexOf(v) === i);
  if (forbidden.length)
    lines.push(`Forbidden words / phrases: ${forbidden.join(", ")}`);

  if (preferences?.audience_address)
    lines.push(`Address audience as: ${preferences.audience_address}`);

  if (lines.length === 0) return "## EMOTIONAL MODIFIER\n(No creator preferences yet — use the base brand voice as-is.)";

  return [
    "## EMOTIONAL MODIFIER",
    "Apply these creator preferences on top of the base voice.",
    bullet(lines),
  ].join("\n");
}

function readRatedOutputs(memory: BrandMemoryEntry[]): RatedOutputSnapshot[] {
  const out: RatedOutputSnapshot[] = [];
  for (const m of memory) {
    if (m.kind !== "rated_output") continue;
    const v = m.value as Partial<RatedOutputSnapshot> | string | null;
    if (!v || typeof v !== "object") continue;
    if (
      v.rating !== "successful" &&
      v.rating !== "weak" &&
      v.rating !== "favorite"
    ) {
      continue;
    }
    out.push({
      rating: v.rating,
      run_id: typeof v.run_id === "string" ? v.run_id : "",
      run_type: (v.run_type as RunType) ?? "single",
      niche: typeof v.niche === "string" ? v.niche : "",
      snippet: typeof v.snippet === "string" ? truncate(v.snippet) : "",
      generated_at:
        typeof v.generated_at === "string"
          ? v.generated_at
          : m.created_at ?? new Date(0).toISOString(),
    });
  }
  return out.sort((a, b) =>
    a.generated_at < b.generated_at ? 1 : -1
  );
}

function buildFeedbackSignalLayer(
  rated: RatedOutputSnapshot[],
  activeNiche: string | undefined
): { layer: string | null; counts: { successful: number; favorite: number; weak: number } } {
  const counts = { successful: 0, favorite: 0, weak: 0 };
  if (rated.length === 0) return { layer: null, counts };

  const favoriteAll = rated.filter((r) => r.rating === "favorite");
  const successfulAll = rated.filter((r) => r.rating === "successful");
  const weakAll = rated.filter((r) => r.rating === "weak");

  const favorite = preferNiche(favoriteAll, activeNiche).slice(
    0,
    MAX_REFERENCE_FAVORITE
  );
  const successful = preferNiche(successfulAll, activeNiche).slice(
    0,
    MAX_REFERENCE_SUCCESS
  );
  const weak = preferNiche(weakAll, activeNiche).slice(0, MAX_REFERENCE_WEAK);

  counts.favorite = favorite.length;
  counts.successful = successful.length;
  counts.weak = weak.length;

  if (favorite.length === 0 && successful.length === 0 && weak.length === 0) {
    return { layer: null, counts };
  }

  const parts: string[] = [];

  if (favorite.length > 0) {
    parts.push(
      [
        "Favorites (creator's all-time winners — match this energy):",
        bullet(favorite.map(formatRated)),
      ].join("\n")
    );
  }
  if (successful.length > 0) {
    parts.push(
      [
        "Recent successful outputs (creator marked as working):",
        bullet(successful.map(formatRated)),
      ].join("\n")
    );
  }
  if (weak.length > 0) {
    parts.push(
      [
        "Recent weak outputs (creator marked as NOT working — avoid this pattern):",
        bullet(weak.map(formatRated)),
      ].join("\n")
    );
  }

  return {
    layer: ["## FEEDBACK SIGNAL", parts.join("\n\n")].join("\n"),
    counts,
  };
}

function preferNiche(
  list: RatedOutputSnapshot[],
  activeNiche: string | undefined
): RatedOutputSnapshot[] {
  if (!activeNiche) return list;
  const lower = activeNiche.toLowerCase();
  const matching = list.filter((r) => r.niche.toLowerCase() === lower);
  const others = list.filter((r) => r.niche.toLowerCase() !== lower);
  return [...matching, ...others];
}

function formatRated(r: RatedOutputSnapshot): string {
  const tag = r.niche ? `[${r.run_type} · ${r.niche}]` : `[${r.run_type}]`;
  return `${tag} ${r.snippet || "(no snippet)"}`;
}

/**
 * Build the layered system+user prompt. Falls back to a minimal layered prompt
 * (base brand only) when no personalization is provided so existing call sites
 * keep working.
 */
export function assembleContextualPrompt(
  inputs: AssemblerInputs
): AssembledPrompt {
  const {
    brand,
    runType,
    runtimeInputs,
    personalization,
    outputContract,
    campaignIntent,
    customUserPrompt,
  } = inputs;

  const baseBrand = buildBaseBrandLayer(brand);
  const campaign = buildCampaignLayer(
    brand,
    runType,
    runtimeInputs,
    campaignIntent
  );
  const outputType = buildOutputTypeLayer(runType, outputContract);
  const emotionalModifier = buildEmotionalModifierLayer(
    brand,
    personalization?.preferences ?? null,
    personalization?.memory ?? []
  );

  const trimmedCustom = customUserPrompt?.trim() ?? "";
  const customLayer =
    trimmedCustom.length > 0
      ? [
          "## CREATOR'S MASTER PROMPT",
          "This is the creator's saved master prompt for this task. Treat it as the highest-priority creative direction; the BASE BRAND and OUTPUT TYPE still constrain format and brand identity.",
          "",
          trimmedCustom,
        ].join("\n")
      : null;

  const rated = readRatedOutputs(personalization?.memory ?? []);
  const activeNiche = pickActiveNiche(brand, runtimeInputs.niche)?.name;
  const { layer: feedbackSignal, counts } = buildFeedbackSignalLayer(
    rated,
    activeNiche
  );

  const systemSections: Array<string | null> = [
    `You are the AI content engine for ${brand.identity.name || "this creator's brand"}. ` +
      `You are a brand-aware creative strategist, not a generic writer. ` +
      `Layer the BASE BRAND, CAMPAIGN, CREATOR'S MASTER PROMPT (if present), OUTPUT TYPE, and EMOTIONAL MODIFIER sections below ` +
      `to produce output that sounds unmistakably like this creator. Honor the OUTPUT TYPE format exactly.`,
    section("", baseBrand),
    section("", campaign),
    customLayer,
    section("", outputType),
    section("", emotionalModifier),
    feedbackSignal,
  ];

  const systemPrompt = systemSections
    .filter((s): s is string => Boolean(s && s.trim()))
    .join("\n\n");

  const userPromptLines: string[] = [
    `Generate the ${describeRunType(runType)}.`,
    `Follow the OUTPUT TYPE format above. Do not break section headers.`,
    `Lean into the EMOTIONAL MODIFIER. Avoid the patterns flagged in FEEDBACK SIGNAL (if any).`,
  ];
  const userPrompt = userPromptLines.join("\n");

  return {
    systemPrompt,
    userPrompt,
    layers: {
      baseBrand,
      campaign,
      outputType,
      emotionalModifier,
      feedbackSignal,
      customUserPrompt: customLayer,
    },
    debugSummary: {
      used_personalization: Boolean(personalization),
      used_custom_user_prompt: Boolean(customLayer),
      rated_outputs_used: counts,
      layer_lengths: {
        baseBrand: baseBrand.length,
        campaign: campaign.length,
        outputType: outputType.length,
        emotionalModifier: emotionalModifier.length,
        feedbackSignal: feedbackSignal?.length ?? 0,
        customUserPrompt: customLayer?.length ?? 0,
      },
    },
  };
}

/**
 * Pull the rated outputs out of a memory array. Exported so the UI can show
 * counts / lists.
 */
export function extractRatedOutputs(
  memory: BrandMemoryEntry[]
): RatedOutputSnapshot[] {
  return readRatedOutputs(memory);
}
