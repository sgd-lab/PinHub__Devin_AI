import { supabase } from "@/lib/db/supabase";

export async function getTodayCost(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("cost_log")
    .select("cost")
    .eq("date", today);
  if (error) return 0;
  return (data || []).reduce((sum, e) => sum + (e.cost || 0), 0);
}

export async function getMonthCost(): Promise<number> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { data, error } = await supabase
    .from("cost_log")
    .select("cost")
    .gte("date", monthStart);
  if (error) return 0;
  return (data || []).reduce((sum, e) => sum + (e.cost || 0), 0);
}

export async function getCostByProvider(
  startDate?: string,
  endDate?: string
): Promise<Record<string, number>> {
  let query = supabase.from("cost_log").select("provider, cost");
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);

  const { data, error } = await query;
  if (error) return {};

  const byProvider: Record<string, number> = {};
  for (const entry of data || []) {
    byProvider[entry.provider] = (byProvider[entry.provider] || 0) + (entry.cost || 0);
  }
  return byProvider;
}

export async function getCostByDay(
  days: number = 30
): Promise<Array<{ date: string; cost: number }>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const start = startDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("cost_log")
    .select("date, cost")
    .gte("date", start)
    .order("date");
  if (error) return [];

  const byDay: Record<string, number> = {};
  for (const entry of data || []) {
    byDay[entry.date] = (byDay[entry.date] || 0) + (entry.cost || 0);
  }

  return Object.entries(byDay)
    .map(([date, cost]) => ({ date, cost }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function addCostLogEntry(entry: {
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  run_id: string;
}): Promise<void> {
  const { error } = await supabase.from("cost_log").insert({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0],
    ...entry,
  });
  if (error) throw error;
}
