import { db } from "@/lib/db/dexie";

export interface AnalyticsData {
  totalPins: number;
  pinsThisMonth: number;
  pinsToday: number;
  byNiche: Record<string, number>;
  byStatus: Record<string, number>;
  byModel: Record<string, number>;
  avgQCScore: number;
  totalCost: number;
  costThisMonth: number;
  pinsOverTime: Array<{ date: string; count: number }>;
  qcScoreOverTime: Array<{ date: string; score: number }>;
}

export async function getAnalytics(
  brandId?: string,
  startDate?: string,
  endDate?: string
): Promise<AnalyticsData> {
  let runs = await db.runs.toArray();

  if (brandId) {
    runs = runs.filter(
      (r) => {
        const snapshot = r.brand_snapshot as Record<string, unknown> | undefined;
        return snapshot && String(snapshot.id || "") === brandId;
      }
    );
  }

  if (startDate) {
    runs = runs.filter((r) => r.created_at >= startDate);
  }
  if (endDate) {
    runs = runs.filter((r) => r.created_at <= endDate);
  }

  const today = new Date().toISOString().split("T")[0];
  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;

  const byNiche: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  const byDate: Record<string, number> = {};
  const qcByDate: Record<string, number[]> = {};

  let totalQC = 0;
  let totalCost = 0;
  let pinsToday = 0;
  let pinsThisMonth = 0;

  for (const run of runs) {
    byNiche[run.niche] = (byNiche[run.niche] || 0) + 1;
    byStatus[run.status] = (byStatus[run.status] || 0) + 1;
    byModel[run.model] = (byModel[run.model] || 0) + 1;
    totalQC += run.qc_results.score;
    totalCost += run.cost_estimate;

    const date = run.created_at.split("T")[0];
    byDate[date] = (byDate[date] || 0) + 1;

    if (!qcByDate[date]) qcByDate[date] = [];
    qcByDate[date].push(run.qc_results.score);

    if (date === today) pinsToday++;
    if (date >= monthStart) pinsThisMonth++;
  }

  const costEntries = await db.costLog.toArray();
  const costThisMonth = costEntries
    .filter((e) => e.date >= monthStart)
    .reduce((sum, e) => sum + e.cost, 0);

  return {
    totalPins: runs.length,
    pinsThisMonth,
    pinsToday,
    byNiche,
    byStatus,
    byModel,
    avgQCScore: runs.length > 0 ? totalQC / runs.length : 0,
    totalCost,
    costThisMonth,
    pinsOverTime: Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    qcScoreOverTime: Object.entries(qcByDate)
      .map(([date, scores]) => ({
        date,
        score: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
