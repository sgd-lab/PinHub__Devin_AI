import { db, type RunRecord } from "./dexie";

export async function getAllRuns(): Promise<RunRecord[]> {
  return db.runs.orderBy("created_at").reverse().toArray();
}

export async function getRunById(id: string): Promise<RunRecord | undefined> {
  return db.runs.get(id);
}

export async function getRunsByNiche(niche: string): Promise<RunRecord[]> {
  return db.runs.where("niche").equals(niche).reverse().sortBy("created_at");
}

export async function getRunsByDateRange(
  start: string,
  end: string
): Promise<RunRecord[]> {
  return db.runs
    .where("target_date")
    .between(start, end, true, true)
    .toArray();
}

export async function getRunsByStatus(
  status: RunRecord["status"]
): Promise<RunRecord[]> {
  return db.runs.where("status").equals(status).toArray();
}

export async function updateRunStatus(
  id: string,
  status: RunRecord["status"],
  postedDate?: string
): Promise<void> {
  const updates: Partial<RunRecord> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (postedDate) updates.posted_date = postedDate;
  await db.runs.update(id, updates);
}

export async function updateRunTargetDate(
  id: string,
  targetDate: string
): Promise<void> {
  await db.runs.update(id, {
    target_date: targetDate,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteRun(id: string): Promise<void> {
  await db.runs.delete(id);
}

export async function deleteRuns(ids: string[]): Promise<void> {
  await db.runs.bulkDelete(ids);
}

export async function getRecentRuns(limit: number = 5): Promise<RunRecord[]> {
  return db.runs.orderBy("created_at").reverse().limit(limit).toArray();
}

export async function getPinsForDateRange(
  start: string,
  end: string,
  brandId?: string
): Promise<RunRecord[]> {
  let runs = await db.runs
    .where("target_date")
    .between(start, end, true, true)
    .toArray();

  if (brandId) {
    runs = runs.filter(
      (r) => (r.brand_snapshot as Record<string, string>)?.id === brandId
    );
  }

  return runs;
}
