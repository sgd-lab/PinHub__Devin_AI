import { supabase } from "./supabase";
import type { RunRecord } from "./dexie";

function pinToRun(pin: Record<string, unknown>): RunRecord {
  return {
    id: pin.id as string,
    created_at: pin.created_at as string,
    updated_at: pin.updated_at as string,
    brand_snapshot: (pin.brand_snapshot as Record<string, unknown>) || {},
    prompt_template: (pin.prompt_template as string) || "",
    runtime_inputs: (pin.runtime_inputs as Record<string, unknown>) || {},
    raw_response: (pin.raw_response as string) || "",
    parsed_fields: (pin.parsed_fields as RunRecord["parsed_fields"]) || {},
    qc_results: (pin.qc_results as RunRecord["qc_results"]) || { score: 0, rules: [] },
    provider: (pin.provider as string) || "",
    model: (pin.model as string) || "",
    input_tokens: (pin.input_tokens as number) || 0,
    output_tokens: (pin.output_tokens as number) || 0,
    cost_estimate: (pin.cost_estimate as number) || 0,
    status: (pin.status as RunRecord["status"]) || "Draft",
    posted_date: pin.posted_date as string | undefined,
    board: pin.board as string | undefined,
    niche: (pin.niche as string) || "",
    target_date: (pin.target_date as string) || "",
    notes: pin.notes as string | undefined,
    tags: pin.tags as string[] | undefined,
    guide_link: pin.guide_link as string | undefined,
    run_type: (pin.run_type as RunRecord["run_type"]) || "single",
    metadata: (pin.metadata as Record<string, unknown>) || {},
  };
}

function runToPin(run: RunRecord): Record<string, unknown> {
  return {
    id: run.id,
    created_at: run.created_at,
    updated_at: run.updated_at,
    brand_id: (run.brand_snapshot as Record<string, unknown>)?.id || null,
    brand_snapshot: run.brand_snapshot,
    prompt_template: run.prompt_template,
    runtime_inputs: run.runtime_inputs,
    raw_response: run.raw_response,
    title: (run.parsed_fields.title as string) || "",
    description: (run.parsed_fields.description as string) || "",
    hashtags: (run.parsed_fields.hashtags as string[]) || [],
    image_prompt_a: (run.parsed_fields.prompt_a as string) || "",
    image_prompt_b: (run.parsed_fields.prompt_b as string) || "",
    parsed_fields: run.parsed_fields,
    qc_score: run.qc_results.score,
    qc_results: run.qc_results,
    provider: run.provider,
    model: run.model,
    input_tokens: run.input_tokens,
    output_tokens: run.output_tokens,
    cost_estimate: run.cost_estimate,
    status: run.status,
    posted_date: run.posted_date || null,
    board: run.board || "",
    niche: run.niche,
    target_date: run.target_date || null,
    notes: run.notes || "",
    tags: run.tags || [],
    guide_link: run.guide_link || "",
    run_type: run.run_type,
    metadata: run.metadata,
  };
}

export async function getAllRuns(): Promise<RunRecord[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(pinToRun);
}

export async function getRunById(id: string): Promise<RunRecord | undefined> {
  const { data, error } = await supabase
    .from("pins")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return undefined;
  return pinToRun(data);
}

export async function getRunsByNiche(niche: string): Promise<RunRecord[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("*")
    .eq("niche", niche)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(pinToRun);
}

export async function getRunsByDateRange(start: string, end: string): Promise<RunRecord[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("*")
    .gte("target_date", start)
    .lte("target_date", end);
  if (error) throw error;
  return (data || []).map(pinToRun);
}

export async function getRunsByStatus(status: RunRecord["status"]): Promise<RunRecord[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("*")
    .eq("status", status);
  if (error) throw error;
  return (data || []).map(pinToRun);
}

export async function updateRunStatus(id: string, status: RunRecord["status"], postedDate?: string): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (postedDate) updates.posted_date = postedDate;
  const { error } = await supabase.from("pins").update(updates).eq("id", id);
  if (error) throw error;
}

export async function updateRunTargetDate(id: string, targetDate: string): Promise<void> {
  const { error } = await supabase
    .from("pins")
    .update({ target_date: targetDate, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteRun(id: string): Promise<void> {
  const { error } = await supabase.from("pins").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteRuns(ids: string[]): Promise<void> {
  const { error } = await supabase.from("pins").delete().in("id", ids);
  if (error) throw error;
}

export async function getRecentRuns(limit: number = 5): Promise<RunRecord[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(pinToRun);
}

export async function getPinsForDateRange(start: string, end: string, brandId?: string): Promise<RunRecord[]> {
  let query = supabase
    .from("pins")
    .select("*")
    .gte("target_date", start)
    .lte("target_date", end);

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(pinToRun);
}

export async function saveRun(run: RunRecord): Promise<void> {
  const { error } = await supabase.from("pins").upsert(runToPin(run));
  if (error) throw error;
}
