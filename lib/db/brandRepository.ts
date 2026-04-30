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
  return {
    id: row.id as string,
    schema_version: (row.schema_version as string) || "v2026.1",
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    identity: row.identity as BrandProfile["identity"],
    visual_system: row.visual_system as BrandProfile["visual_system"],
    voice: row.voice as BrandProfile["voice"],
    model_persona: row.model_persona as BrandProfile["model_persona"],
    niches: row.niches as BrandProfile["niches"],
    pinterest: row.pinterest as BrandProfile["pinterest"],
    file_naming: row.file_naming as BrandProfile["file_naming"],
    seo: row.seo as BrandProfile["seo"],
  } as BrandProfile;
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
    schema_version: brand.schema_version || "v2026.1",
    identity: brand.identity,
    visual_system: brand.visual_system,
    voice: brand.voice,
    model_persona: brand.model_persona,
    niches: brand.niches,
    pinterest: brand.pinterest,
    file_naming: brand.file_naming,
    seo: brand.seo,
    metadata: {},
  };
}
