"use client";

import { getSupabaseBrowserClient } from "@/lib/db/supabase";
import type { BrandMemoryEntry, BrandMemoryKind } from "./types";

interface MemoryRow {
  id: string;
  user_id: string;
  kind: BrandMemoryKind;
  value: BrandMemoryEntry["value"];
  weight: number | null;
  created_at: string | null;
  updated_at: string | null;
}

function rowToEntry(row: MemoryRow): BrandMemoryEntry {
  return {
    id: row.id,
    user_id: row.user_id,
    kind: row.kind,
    value: row.value,
    weight: row.weight ?? 1.0,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function fetchBrandMemory(
  userId: string
): Promise<BrandMemoryEntry[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from("brand_memory")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<MemoryRow[]>();

  if (error) {
    console.error("[brandMemoryRepository] fetch error", error);
    return [];
  }
  return (data ?? []).map(rowToEntry);
}

export async function addBrandMemory(
  userId: string,
  kind: BrandMemoryKind,
  value: BrandMemoryEntry["value"],
  weight = 1.0
): Promise<BrandMemoryEntry | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from("brand_memory")
    .insert({ user_id: userId, kind, value, weight })
    .select("*")
    .single<MemoryRow>();

  if (error) {
    console.error("[brandMemoryRepository] insert error", error);
    return null;
  }
  return rowToEntry(data);
}

export async function deleteBrandMemory(id: string): Promise<boolean> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return false;

  const { error } = await sb.from("brand_memory").delete().eq("id", id);
  if (error) {
    console.error("[brandMemoryRepository] delete error", error);
    return false;
  }
  return true;
}

export async function replaceBrandMemoryOfKind(
  userId: string,
  kind: BrandMemoryKind,
  values: Array<BrandMemoryEntry["value"]>
): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return;

  await sb
    .from("brand_memory")
    .delete()
    .eq("user_id", userId)
    .eq("kind", kind);

  if (values.length === 0) return;

  const rows = values.map((value) => ({
    user_id: userId,
    kind,
    value,
    weight: 1.0,
  }));
  const { error } = await sb.from("brand_memory").insert(rows);
  if (error) {
    console.error("[brandMemoryRepository] bulk insert error", error);
  }
}
