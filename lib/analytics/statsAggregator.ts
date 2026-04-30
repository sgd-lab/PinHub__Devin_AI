import { supabase } from "@/lib/db/supabase";

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
  let query = supabase.from("pins").select("*");

  if (brandId) query = query.eq("brand_id", brandId);
  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data: runs, error } = await query;
  if (error) throw error;

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

  for (const run of runs || []) {
    const niche = (run.niche as string) || "Unknown";
    const status = (run.status as string) || "Draft";
    const model = (run.model as string) || "Unknown";
    const qcResults = run.qc_results as { score: number } | null;
    const qcScore = qcResults?.score || 0;

    byNiche[niche] = (byNiche[niche] || 0) + 1;
    byStatus[status] = (byStatus[status] || 0) + 1;
    byModel[model] = (byModel[model] || 0) + 1;
    totalQC += qcScore;
    totalCost += (run.cost_estimate as number) || 0;

    const date = ((run.created_at as string) || "").split("T")[0];
    byDate[date] = (byDate[date] || 0) + 1;

    if (!qcByDate[date]) qcByDate[date] = [];
    qcByDate[date].push(qcScore);

    if (date === today) pinsToday++;
    if (date >= monthStart) pinsThisMonth++;
  }

  const { data: costEntries } = await supabase
    .from("cost_log")
    .select("cost")
    .gte("date", monthStart);

  const costThisMonth = (costEntries || []).reduce((sum, e) => sum + ((e.cost as number) || 0), 0);

  return {
    totalPins: (runs || []).length,
    pinsThisMonth,
    pinsToday,
    byNiche,
    byStatus,
    byModel,
    avgQCScore: (runs || []).length > 0 ? totalQC / (runs || []).length : 0,
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
