import { saveAs } from "file-saver";
import type { RunRecord } from "@/lib/db/dexie";

export function exportRunsToJSON(runs: RunRecord[], filename?: string): void {
  const data = {
    exported_at: new Date().toISOString(),
    version: "v2026.1",
    record_count: runs.length,
    runs,
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  saveAs(blob, filename || `pinhub-export-${new Date().toISOString().split("T")[0]}.json`);
}

export function exportBrandToJSON(brand: Record<string, unknown>, filename?: string): void {
  const json = JSON.stringify(brand, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const name = (brand as Record<string, Record<string, string>>).identity?.name || "brand";
  saveAs(blob, filename || `${name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.brand.json`);
}
