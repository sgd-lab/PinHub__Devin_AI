import type { RunRecord } from "@/lib/db/dexie";

export function generatePDFContent(runs: RunRecord[]): string {
  // Uses @react-pdf/renderer at runtime (dynamic import in component)
  // This is the data preparation layer
  return JSON.stringify(
    runs.map((run) => ({
      title: run.parsed_fields.title || "Untitled",
      description: run.parsed_fields.description || "",
      hashtags: (run.parsed_fields.hashtags as string[])?.join(" ") || "",
      promptA: run.parsed_fields.prompt_a || "",
      promptB: run.parsed_fields.prompt_b || "",
      niche: run.niche,
      date: run.target_date,
      brand: (run.brand_snapshot as Record<string, Record<string, string>>)?.identity?.name || "",
      qcScore: run.qc_results.score,
      provider: run.provider,
      model: run.model,
      cost: run.cost_estimate,
    }))
  );
}

export const PDF_STYLES = {
  page: {
    backgroundColor: "#F5F0E8",
    padding: 40,
    fontFamily: "Helvetica",
  },
  heading: {
    fontSize: 24,
    color: "#3E2723",
    marginBottom: 12,
    fontFamily: "Helvetica-Bold",
  },
  subheading: {
    fontSize: 16,
    color: "#3E2723",
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
  },
  body: {
    fontSize: 11,
    color: "#3D3D3D",
    lineHeight: 1.6,
    marginBottom: 8,
  },
  accent: {
    color: "#C9A99A",
  },
  divider: {
    borderBottom: "1px solid #C9A99A",
    marginVertical: 16,
  },
  footer: {
    fontSize: 8,
    color: "#C9B8A8",
    textAlign: "center" as const,
    marginTop: 20,
  },
};
