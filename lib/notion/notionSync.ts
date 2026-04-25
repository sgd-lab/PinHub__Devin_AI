import type { RunRecord } from "@/lib/db/dexie";

export interface NotionSyncResult {
  success: boolean;
  pageId?: string;
  error?: string;
}

export async function syncRunToNotion(
  run: RunRecord,
  notionToken: string,
  databaseId: string
): Promise<NotionSyncResult> {
  try {
    const properties = buildNotionProperties(run);

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, pageId: data.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function syncBatchToNotion(
  runs: RunRecord[],
  notionToken: string,
  databaseId: string
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;
  let failed = 0;

  for (const run of runs) {
    const result = await syncRunToNotion(run, notionToken, databaseId);
    if (result.success) {
      synced++;
    } else {
      failed++;
      if (result.error) errors.push(result.error);
    }
    // Rate limiting
    await new Promise((r) => setTimeout(r, 350));
  }

  return { synced, failed, errors };
}

function buildNotionProperties(run: RunRecord): Record<string, unknown> {
  const brand = (run.brand_snapshot as Record<string, Record<string, string>>)?.identity?.name || "";

  return {
    Title: { title: [{ text: { content: run.parsed_fields.title || "Untitled" } }] },
    Description: { rich_text: [{ text: { content: String(run.parsed_fields.description || "").slice(0, 2000) } }] },
    Hashtags: {
      multi_select: ((run.parsed_fields.hashtags as string[]) || [])
        .slice(0, 10)
        .map((h) => ({ name: h.replace("#", "") })),
    },
    "Prompt A": { rich_text: [{ text: { content: String(run.parsed_fields.prompt_a || "").slice(0, 2000) } }] },
    "Prompt B": { rich_text: [{ text: { content: String(run.parsed_fields.prompt_b || "").slice(0, 2000) } }] },
    Niche: { select: { name: run.niche } },
    "Target Date": { date: { start: run.target_date } },
    Status: { status: { name: run.status } },
    Board: { select: run.board ? { name: run.board } : null },
    "QC Pass": { checkbox: run.qc_results.score >= 7 },
    "Run ID": { rich_text: [{ text: { content: run.id } }] },
    Brand: { select: { name: brand } },
    "Guide Link": { url: run.guide_link || null },
    "Cost Estimate": { number: run.cost_estimate },
    "Model Used": { select: { name: run.model } },
  };
}
