import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions matching the Supabase schema

export interface PinRow {
  id: string;
  created_at: string;
  updated_at: string;
  brand_id: string | null;
  brand_snapshot: Record<string, unknown>;
  prompt_template: string;
  runtime_inputs: Record<string, unknown>;
  raw_response: string;
  title: string;
  description: string;
  caption: string;
  hashtags: string[];
  image_prompt_a: string;
  image_prompt_b: string;
  parsed_fields: Record<string, unknown>;
  qc_score: number;
  qc_results: { score: number; rules: Array<{ id: string; status: string; message?: string }> };
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
  status: "Draft" | "Approved" | "Posted" | "Archived";
  posted_date: string | null;
  board: string;
  niche: string;
  target_date: string | null;
  notes: string;
  tags: string[];
  guide_link: string;
  run_type: "single" | "daily" | "mega" | "guide";
  synced_to_notion: boolean;
  metadata: Record<string, unknown>;
}

export interface BrandRow {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  tagline: string;
  operator_name: string;
  primary_market: string;
  identity: Record<string, unknown>;
  visual_system: Record<string, unknown>;
  voice: Record<string, unknown>;
  niches: Record<string, unknown>[];
  metadata: Record<string, unknown>;
}

export interface PromptRow {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  version: string;
  description: string;
  prompt_text: string;
  variable_bindings: Record<string, string>;
  output_schema: Array<{ key: string; label: string; extraction_regex?: string; required: boolean }>;
  compatible_generators: string[];
  qc_rules: Array<Record<string, unknown>>;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  last_run_at: string | null;
  run_count: number;
  average_qc_score: number;
}

export interface CostLogRow {
  id: string;
  created_at: string;
  date: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  run_id: string;
}

export interface AppSettingRow {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface ExportHistoryRow {
  id: string;
  created_at: string;
  filename: string;
  format: string;
  record_count: number;
  metadata: Record<string, unknown>;
}

export interface ResearchCacheRow {
  id: string;
  niche: string;
  week_of: string;
  data: Record<string, unknown>;
  expires_at: string;
  created_at: string;
}
