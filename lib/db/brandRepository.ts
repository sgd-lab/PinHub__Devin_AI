import { supabase } from "./supabase";
import type { BrandProfile } from "@/lib/brands/brandSchema";
import type { BrandVersionSnapshot } from "./dexie";

export async function getAllBrands(): Promise<BrandProfile[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToBrand);
}

export async function getBrandById(id: string): Promise<BrandProfile | undefined> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return undefined;
  return rowToBrand(data);
}

export async function saveBrand(brand: BrandProfile): Promise<void> {
  const row = brandToRow(brand);
  const { error } = await supabase.from("brands").upsert(row);
  if (error) throw error;

  const { error: vErr } = await supabase.from("brand_versions").insert({
    id: crypto.randomUUID(),
    brand_id: brand.id,
    snapshot: brand as unknown as Record<string, unknown>,
    created_at: new Date().toISOString(),
  });
  if (vErr) throw vErr;
}

export async function deleteBrand(id: string): Promise<void> {
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw error;
}

export async function getBrandVersions(brandId: string): Promise<BrandVersionSnapshot[]> {
  const { data, error } = await supabase
    .from("brand_versions")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    brand_id: r.brand_id,
    snapshot: r.snapshot as Record<string, unknown>,
    created_at: r.created_at,
    change_summary: r.change_summary,
  }));
}

export async function restoreBrandVersion(versionId: string): Promise<BrandProfile | null> {
  const { data, error } = await supabase
    .from("brand_versions")
    .select("*")
    .eq("id", versionId)
    .single();
  if (error || !data) return null;

  const restored = {
    ...(data.snapshot as Record<string, unknown>),
    updated_at: new Date().toISOString(),
  } as unknown as BrandProfile;

  await saveBrand(restored);
  return restored;
}

function rowToBrand(row: Record<string, unknown>): BrandProfile {
  if (row.identity && typeof row.identity === "object" && "name" in (row.identity as Record<string, unknown>)) {
    return row as unknown as BrandProfile;
  }
  return {
    ...row,
    identity: {
      name: row.name as string,
      tagline: row.tagline as string,
      operator_name: row.operator_name as string,
      primary_market: row.primary_market as string,
      ...(row.identity as Record<string, unknown> || {}),
    },
  } as unknown as BrandProfile;
}

function brandToRow(brand: BrandProfile): Record<string, unknown> {
  return {
    id: brand.id,
    created_at: brand.created_at,
    updated_at: brand.updated_at || new Date().toISOString(),
    name: brand.identity?.name || "",
    tagline: brand.identity?.tagline || "",
    operator_name: brand.identity?.operator_name || "",
    primary_market: brand.identity?.primary_market || "",
    identity: brand.identity,
    visual_system: brand.visual_system,
    voice: brand.voice,
    niches: brand.niches,
    metadata: {},
  };
}
