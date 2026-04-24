import Papa from "papaparse";
import { saveAs } from "file-saver";
import type { RunRecord } from "@/lib/db/dexie";

const CSV_COLUMNS = [
  "run_id", "generated_date", "target_date", "brand", "niche", "board",
  "status", "title", "title_char_count", "description",
  "description_char_count", "hashtags", "image_prompt_a", "image_prompt_b",
  "qc_pass", "provider", "model", "tokens_used", "cost_estimate", "notes",
];

export function exportRunsToCSV(runs: RunRecord[], filename?: string): void {
  const rows = runs.map((run) => ({
    run_id: run.id,
    generated_date: run.created_at,
    target_date: run.target_date,
    brand: (run.brand_snapshot as Record<string, Record<string, string>>)?.identity?.name || "",
    niche: run.niche,
    board: run.board || "",
    status: run.status,
    title: run.parsed_fields.title || "",
    title_char_count: (run.parsed_fields.title as string)?.length || 0,
    description: run.parsed_fields.description || "",
    description_char_count: (run.parsed_fields.description as string)?.length || 0,
    hashtags: (run.parsed_fields.hashtags as string[])?.join(", ") || "",
    image_prompt_a: run.parsed_fields.prompt_a || "",
    image_prompt_b: run.parsed_fields.prompt_b || "",
    qc_pass: run.qc_results.score >= 7 ? "Yes" : "No",
    provider: run.provider,
    model: run.model,
    tokens_used: run.input_tokens + run.output_tokens,
    cost_estimate: run.cost_estimate.toFixed(4),
    notes: run.notes || "",
  }));

  const csv = Papa.unparse(rows, { columns: CSV_COLUMNS });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  saveAs(blob, filename || `pinhub-export-${new Date().toISOString().split("T")[0]}.csv`);
}
