// Type definitions for PinHub data models
// Previously backed by Dexie/IndexedDB, now backed by Supabase

export interface RunRecord {
  id: string;
  created_at: string;
  updated_at: string;
  brand_snapshot: Record<string, unknown>;
  prompt_template: string;
  runtime_inputs: Record<string, unknown>;
  raw_response: string;
  parsed_fields: {
    title?: string;
    description?: string;
    hashtags?: string[];
    prompt_a?: string;
    prompt_b?: string;
    [key: string]: unknown;
  };
  qc_results: {
    score: number;
    rules: Array<{ id: string; status: "pass" | "warn" | "fail"; message?: string }>;
  };
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
  status: "Draft" | "Approved" | "Posted" | "Archived";
  posted_date?: string;
  board?: string;
  niche: string;
  target_date: string;
  notes?: string;
  tags?: string[];
  guide_link?: string;
  run_type: "single" | "daily" | "mega" | "guide";
  metadata: Record<string, unknown>;
}

export interface BrandVersionSnapshot {
  id: string;
  brand_id: string;
  snapshot: Record<string, unknown>;
  created_at: string;
  change_summary?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  prompt_text: string;
  variable_bindings: Record<string, string>;
  output_schema: Array<{
    key: string;
    label: string;
    extraction_regex?: string;
    required: boolean;
  }>;
  compatible_generators: Array<"single" | "daily" | "guide" | "mega" | "custom">;
  qc_rules: Array<{
    rule_type: string;
    target_field: string;
    params: Record<string, unknown>;
    severity: "hard_fail" | "warn" | "soft_check";
    message: string;
    fix_hint?: string;
  }>;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  last_run_at?: string;
  run_count: number;
  average_qc_score: number;
  created_at: string;
  updated_at: string;
}

export interface PromptVersionSnapshot {
  id: string;
  prompt_id: string;
  snapshot: Record<string, unknown>;
  created_at: string;
}

export interface SettingsRecord {
  id: string;
  data: Record<string, unknown>;
}

export interface CostLogEntry {
  id: string;
  date: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  run_id: string;
}

export interface ResearchCacheEntry {
  id: string;
  niche: string;
  week_of: string;
  data: Record<string, unknown>;
  expires_at: string;
}

export interface DownloadHistoryEntry {
  id: string;
  filename: string;
  format: string;
  record_count: number;
  created_at: string;
  blob_url?: string;
}
