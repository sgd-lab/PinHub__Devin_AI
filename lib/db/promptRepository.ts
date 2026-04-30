import { supabase } from "./supabase";
import type { PromptTemplate, PromptVersionSnapshot } from "./dexie";

export async function getAllPrompts(): Promise<PromptTemplate[]> {
  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToPrompt);
}

export async function getPromptById(id: string): Promise<PromptTemplate | undefined> {
  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return undefined;
  return rowToPrompt(data);
}

export async function savePrompt(prompt: PromptTemplate): Promise<void> {
  const { error } = await supabase.from("prompts").upsert({
    id: prompt.id,
    created_at: prompt.created_at,
    updated_at: prompt.updated_at || new Date().toISOString(),
    name: prompt.name,
    version: prompt.version,
    description: prompt.description,
    prompt_text: prompt.prompt_text,
    variable_bindings: prompt.variable_bindings,
    output_schema: prompt.output_schema,
    compatible_generators: prompt.compatible_generators,
    qc_rules: prompt.qc_rules,
    estimated_input_tokens: prompt.estimated_input_tokens,
    estimated_output_tokens: prompt.estimated_output_tokens,
    last_run_at: prompt.last_run_at || null,
    run_count: prompt.run_count,
    average_qc_score: prompt.average_qc_score,
  });
  if (error) throw error;

  const { error: vErr } = await supabase.from("prompt_versions").insert({
    id: crypto.randomUUID(),
    prompt_id: prompt.id,
    snapshot: prompt as unknown as Record<string, unknown>,
    created_at: new Date().toISOString(),
  });
  if (vErr) throw vErr;
}

export async function deletePrompt(id: string): Promise<void> {
  const { error } = await supabase.from("prompts").delete().eq("id", id);
  if (error) throw error;
}

export async function getPromptVersions(promptId: string): Promise<PromptVersionSnapshot[]> {
  const { data, error } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("prompt_id", promptId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    prompt_id: r.prompt_id,
    snapshot: r.snapshot as Record<string, unknown>,
    created_at: r.created_at,
  }));
}

export async function getPromptsByGenerator(
  generator: "single" | "daily" | "guide" | "custom"
): Promise<PromptTemplate[]> {
  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .contains("compatible_generators", [generator]);
  if (error) throw error;
  return (data || []).map(rowToPrompt);
}

function rowToPrompt(row: Record<string, unknown>): PromptTemplate {
  return {
    id: row.id as string,
    name: (row.name as string) || "",
    version: (row.version as string) || "1.0",
    description: (row.description as string) || "",
    prompt_text: (row.prompt_text as string) || "",
    variable_bindings: (row.variable_bindings as Record<string, string>) || {},
    output_schema: (row.output_schema as PromptTemplate["output_schema"]) || [],
    compatible_generators: (row.compatible_generators as PromptTemplate["compatible_generators"]) || [],
    qc_rules: (row.qc_rules as PromptTemplate["qc_rules"]) || [],
    estimated_input_tokens: (row.estimated_input_tokens as number) || 0,
    estimated_output_tokens: (row.estimated_output_tokens as number) || 0,
    last_run_at: row.last_run_at as string | undefined,
    run_count: (row.run_count as number) || 0,
    average_qc_score: (row.average_qc_score as number) || 0,
    created_at: (row.created_at as string) || new Date().toISOString(),
    updated_at: (row.updated_at as string) || new Date().toISOString(),
  };
}
