import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "./providers/types";

interface UserProfileRow {
  user_id: string;
  display_name: string | null;
  main_niche: string | null;
  sub_niches: string[] | null;
  voice_tone: string | null;
  brand_colors: string[] | null;
  onboarding_completed_at: string | null;
}

interface UserPreferencesRow {
  favorite_styles: string[] | null;
  preferred_hook_styles: string[] | null;
  preferred_emotional_tones: string[] | null;
  recurring_goals: string[] | null;
  saved_prompts: string[] | null;
}

interface BrandMemoryRow {
  selected_outputs: unknown[] | null;
  rejected_outputs: unknown[] | null;
}

interface MemoryEventRow {
  kind: string;
  payload: Record<string, unknown>;
  created_at: string;
}

interface RecentMessageRow {
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface CreatorContext {
  profile: UserProfileRow | null;
  preferences: UserPreferencesRow | null;
  brandMemory: BrandMemoryRow | null;
  recentMemoryEvents: MemoryEventRow[];
}

/**
 * Load every signal we have about a creator, in one trip. The assistant
 * uses this to ground its strategy advice in the creator's actual brand
 * and remembered behavior.
 */
export async function loadCreatorContext(
  sb: SupabaseClient,
  userId: string
): Promise<CreatorContext> {
  const [
    { data: profile },
    { data: preferences },
    { data: brandMemory },
    { data: events },
  ] = await Promise.all([
    sb
      .from("user_profiles")
      .select(
        "user_id, display_name, main_niche, sub_niches, voice_tone, brand_colors, onboarding_completed_at"
      )
      .eq("user_id", userId)
      .maybeSingle<UserProfileRow>(),
    sb
      .from("user_preferences")
      .select(
        "favorite_styles, preferred_hook_styles, preferred_emotional_tones, recurring_goals, saved_prompts"
      )
      .eq("user_id", userId)
      .maybeSingle<UserPreferencesRow>(),
    sb
      .from("brand_memory")
      .select("selected_outputs, rejected_outputs")
      .eq("user_id", userId)
      .maybeSingle<BrandMemoryRow>(),
    sb
      .from("ai_memory_events")
      .select("kind, payload, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40)
      .returns<MemoryEventRow[]>(),
  ]);

  return {
    profile: profile ?? null,
    preferences: preferences ?? null,
    brandMemory: brandMemory ?? null,
    recentMemoryEvents: events ?? [],
  };
}

function bullet(items: string[]): string {
  return items.filter(Boolean).map((s) => `- ${s}`).join("\n");
}

function summarizeEvents(events: MemoryEventRow[]): string {
  if (events.length === 0) return "No prior memory yet — this is a fresh creator.";

  const groups: Record<string, string[]> = {};
  for (const e of events) {
    const summary = formatEventPayload(e);
    if (!summary) continue;
    if (!groups[e.kind]) groups[e.kind] = [];
    if (groups[e.kind].length < 6) groups[e.kind].push(summary);
  }

  const sections: string[] = [];
  if (groups.accepted_suggestion?.length) {
    sections.push(`Accepted suggestions:\n${bullet(groups.accepted_suggestion)}`);
  }
  if (groups.rejected_suggestion?.length) {
    sections.push(`Rejected suggestions:\n${bullet(groups.rejected_suggestion)}`);
  }
  if (groups.favorite_style?.length) {
    sections.push(`Favorite styles:\n${bullet(groups.favorite_style)}`);
  }
  if (groups.creator_goal?.length) {
    sections.push(`Recurring goals:\n${bullet(groups.creator_goal)}`);
  }
  if (groups.preferred_tone?.length) {
    sections.push(`Preferred tones:\n${bullet(groups.preferred_tone)}`);
  }
  return sections.length > 0
    ? sections.join("\n\n")
    : "No prior memory yet.";
}

function formatEventPayload(e: MemoryEventRow): string {
  const p = e.payload ?? {};
  if (typeof p === "string") return p as string;
  const text =
    (typeof p.text === "string" && p.text) ||
    (typeof p.label === "string" && p.label) ||
    (typeof p.title === "string" && p.title) ||
    (typeof p.value === "string" && p.value) ||
    "";
  return text || JSON.stringify(p).slice(0, 120);
}

/**
 * Build the system prompt for the AI Creative Assistant. Injects everything
 * we know about the creator so the assistant behaves like their brand
 * advisor, not a generic chatbot.
 */
export function buildAssistantSystemPrompt(ctx: CreatorContext): string {
  const p = ctx.profile;
  const pref = ctx.preferences;
  const mem = ctx.brandMemory;

  const identityLines: string[] = [];
  if (p?.display_name) identityLines.push(`Creator name: ${p.display_name}`);
  if (p?.main_niche) identityLines.push(`Main niche: ${p.main_niche}`);
  if (p?.sub_niches?.length)
    identityLines.push(`Sub-niches: ${p.sub_niches.join(", ")}`);
  if (p?.voice_tone) identityLines.push(`Voice / tone: ${p.voice_tone}`);
  if (p?.brand_colors?.length)
    identityLines.push(`Brand colors: ${p.brand_colors.join(", ")}`);

  const prefLines: string[] = [];
  if (pref?.favorite_styles?.length)
    prefLines.push(`Favorite styles: ${pref.favorite_styles.join(", ")}`);
  if (pref?.preferred_hook_styles?.length)
    prefLines.push(
      `Preferred hook styles: ${pref.preferred_hook_styles.join(", ")}`
    );
  if (pref?.preferred_emotional_tones?.length)
    prefLines.push(
      `Preferred emotional tones: ${pref.preferred_emotional_tones.join(", ")}`
    );
  if (pref?.recurring_goals?.length)
    prefLines.push(`Recurring goals: ${pref.recurring_goals.join(", ")}`);
  if (pref?.saved_prompts?.length)
    prefLines.push(
      `Saved prompts (count): ${pref.saved_prompts.length}`
    );

  const memLines: string[] = [];
  if (mem?.selected_outputs?.length)
    memLines.push(`Selected outputs in library: ${mem.selected_outputs.length}`);
  if (mem?.rejected_outputs?.length)
    memLines.push(`Rejected outputs: ${mem.rejected_outputs.length}`);

  const memorySummary = summarizeEvents(ctx.recentMemoryEvents);

  const sections: string[] = [
    `You are the in-app creative strategist for PinHub, a Pinterest content studio.
You are NOT a generic chatbot. You behave like a brand advisor and content director
who already knows the creator's brand, niches, voice, and history.`,
    `Tone: warm, direct, opinionated. Give concrete advice — concept ideas, hook
phrasings, board strategies, monetization angles — never vague platitudes.
When you suggest a pin, hook, or guide concept, format it so the creator
could paste it into the existing Pin / Daily / Guide generators.`,
    identityLines.length > 0
      ? `Creator profile:\n${bullet(identityLines)}`
      : "Creator profile: not yet onboarded — keep questions to a minimum and help them define their brand.",
    prefLines.length > 0 ? `Preferences:\n${bullet(prefLines)}` : null,
    memLines.length > 0 ? `Library signals:\n${bullet(memLines)}` : null,
    `Remembered behavior:\n${memorySummary}`,
    `Rules:
- Never invent provider/API details. The user's keys are managed by PinHub.
- If the creator asks for a pin, daily set, or guide, reference their actual niches and palette.
- If the creator asks "what should I post today?", look at their rotation hint (day of week) and recent rejected suggestions — avoid repeats.
- When the creator accepts or rejects something, briefly acknowledge it; the system records that as memory.
- Keep replies under ~250 words unless asked for a long-form guide.`,
  ].filter((s): s is string => Boolean(s));

  return sections.join("\n\n");
}

/**
 * Compose the final messages array sent to the provider:
 *   [system prompt, ...recent transcript, latest user message]
 *
 * Caps history to keep token usage sane.
 */
export function composeAssistantMessages(args: {
  systemPrompt: string;
  history: RecentMessageRow[];
  userMessage: string;
  maxHistoryMessages?: number;
}): ChatMessage[] {
  const cap = args.maxHistoryMessages ?? 20;
  const recent = args.history.slice(-cap);
  const messages: ChatMessage[] = [
    { role: "system", content: args.systemPrompt },
  ];
  for (const m of recent) {
    if (m.role === "system") continue;
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: "user", content: args.userMessage });
  return messages;
}
