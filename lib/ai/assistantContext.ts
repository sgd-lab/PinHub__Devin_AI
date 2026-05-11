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

interface UsageSnapshotRow {
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
  created_at: string;
}

export interface UsageSnapshot {
  today_tokens: number;
  today_cost: number;
  today_runs: number;
  month_tokens: number;
  month_cost: number;
  month_runs: number;
  top_provider: { provider: string; tokens: number; cost: number } | null;
}

export interface CreatorContext {
  profile: UserProfileRow | null;
  preferences: UserPreferencesRow | null;
  brandMemory: BrandMemoryRow | null;
  recentMemoryEvents: MemoryEventRow[];
  usage: UsageSnapshot | null;
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
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();

  const [
    { data: profile },
    { data: preferences },
    { data: brandMemory },
    { data: events },
    { data: usageRows, error: usageError },
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
    sb
      .from("ai_usage_log")
      .select("provider, model, input_tokens, output_tokens, cost_estimate, created_at")
      .eq("user_id", userId)
      .gte("created_at", startOfMonth)
      .order("created_at", { ascending: false })
      .returns<UsageSnapshotRow[]>(),
  ]);

  // Tolerate the ai_usage_log table not existing yet (older Supabase project)
  // so the assistant chat keeps working even before 0007 is applied.
  const usage = usageError ? null : summarizeUsage(usageRows ?? [], startOfDay);

  return {
    profile: profile ?? null,
    preferences: preferences ?? null,
    brandMemory: brandMemory ?? null,
    recentMemoryEvents: events ?? [],
    usage,
  };
}

function summarizeUsage(
  rows: UsageSnapshotRow[],
  startOfDayIso: string
): UsageSnapshot {
  let today_tokens = 0;
  let today_cost = 0;
  let today_runs = 0;
  let month_tokens = 0;
  let month_cost = 0;
  const byProvider = new Map<string, { tokens: number; cost: number }>();
  for (const r of rows) {
    const t = (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
    const c = Number(r.cost_estimate ?? 0);
    month_tokens += t;
    month_cost += c;
    if (r.created_at >= startOfDayIso) {
      today_tokens += t;
      today_cost += c;
      today_runs += 1;
    }
    const cur = byProvider.get(r.provider) ?? { tokens: 0, cost: 0 };
    cur.tokens += t;
    cur.cost += c;
    byProvider.set(r.provider, cur);
  }
  let top_provider: UsageSnapshot["top_provider"] = null;
  byProvider.forEach((v, provider) => {
    if (!top_provider || v.cost > top_provider.cost) {
      top_provider = {
        provider,
        tokens: v.tokens,
        cost: Number(v.cost.toFixed(6)),
      };
    }
  });
  return {
    today_tokens,
    today_cost: Number(today_cost.toFixed(6)),
    today_runs,
    month_tokens,
    month_cost: Number(month_cost.toFixed(6)),
    month_runs: rows.length,
    top_provider,
  };
}

function bullet(items: string[]): string {
  return items.filter(Boolean).map((s) => `- ${s}`).join("\n");
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function buildUsageSection(usage: UsageSnapshot | null): string {
  if (!usage) {
    return `Live usage (this user, current month):
- Unknown — the ai_usage_log table is not reachable yet. Tell the user to open Settings → API Keys to see provider quotas.`;
  }
  if (usage.month_runs === 0) {
    return `Live usage (this user, current month):
- 0 generations so far this month — they haven't spent any credits yet.`;
  }
  const lines: string[] = [
    `Today: ${formatTokenCount(usage.today_tokens)} tokens · $${usage.today_cost.toFixed(4)} · ${usage.today_runs} run${usage.today_runs === 1 ? "" : "s"}.`,
    `This month: ${formatTokenCount(usage.month_tokens)} tokens · $${usage.month_cost.toFixed(4)} · ${usage.month_runs} run${usage.month_runs === 1 ? "" : "s"}.`,
  ];
  if (usage.top_provider) {
    lines.push(
      `Top provider this month: ${usage.top_provider.provider} (${formatTokenCount(usage.top_provider.tokens)} tokens, $${usage.top_provider.cost.toFixed(4)}).`
    );
  }
  return `Live usage (this user, current month):\n${bullet(lines)}`;
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
  const usageSection = buildUsageSection(ctx.usage);

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
    usageSection,
    `Rules:
- Never invent provider/API details. The user's keys are managed by PinHub.
- If the creator asks for a pin, daily set, or guide, reference their actual niches and palette.
- If the creator asks "what should I post today?", look at their rotation hint (day of week) and recent rejected suggestions — avoid repeats.
- When the creator accepts or rejects something, briefly acknowledge it; the system records that as memory.
- If the creator asks anything about credits, tokens, cost, billing, or quota, use the numbers in "Live usage" verbatim — do not invent or round aggressively. If usage is unknown, tell them to open Settings → API Keys / Usage.
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
