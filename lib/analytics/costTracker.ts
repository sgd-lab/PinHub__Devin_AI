import { db, type CostLogEntry } from "@/lib/db/dexie";

export async function getTodayCost(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const entries = await db.costLog.where("date").equals(today).toArray();
  return entries.reduce((sum, e) => sum + e.cost, 0);
}

export async function getMonthCost(): Promise<number> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const entries = await db.costLog.where("date").aboveOrEqual(monthStart).toArray();
  return entries.reduce((sum, e) => sum + e.cost, 0);
}

export async function getCostByProvider(
  startDate?: string,
  endDate?: string
): Promise<Record<string, number>> {
  let entries: CostLogEntry[];
  if (startDate && endDate) {
    entries = await db.costLog
      .where("date")
      .between(startDate, endDate, true, true)
      .toArray();
  } else {
    entries = await db.costLog.toArray();
  }

  const byProvider: Record<string, number> = {};
  for (const entry of entries) {
    byProvider[entry.provider] = (byProvider[entry.provider] || 0) + entry.cost;
  }
  return byProvider;
}

export async function getCostByDay(
  days: number = 30
): Promise<Array<{ date: string; cost: number }>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const start = startDate.toISOString().split("T")[0];

  const entries = await db.costLog
    .where("date")
    .aboveOrEqual(start)
    .toArray();

  const byDay: Record<string, number> = {};
  for (const entry of entries) {
    byDay[entry.date] = (byDay[entry.date] || 0) + entry.cost;
  }

  return Object.entries(byDay)
    .map(([date, cost]) => ({ date, cost }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
