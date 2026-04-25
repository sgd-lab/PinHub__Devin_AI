import { db, type BrandVersionSnapshot } from "./dexie";
import type { BrandProfile } from "@/lib/brands/brandSchema";

export async function getAllBrands(): Promise<BrandProfile[]> {
  const brands = await db.brands.toArray();
  return brands as unknown as BrandProfile[];
}

export async function getBrandById(
  id: string
): Promise<BrandProfile | undefined> {
  const brand = await db.brands.get(id);
  return brand as unknown as BrandProfile | undefined;
}

export async function saveBrand(brand: BrandProfile): Promise<void> {
  await db.brands.put(brand as unknown as Record<string, unknown>);
  // Save version snapshot
  const snapshot: BrandVersionSnapshot = {
    id: crypto.randomUUID(),
    brand_id: brand.id,
    snapshot: brand as unknown as Record<string, unknown>,
    created_at: new Date().toISOString(),
  };
  await db.brandVersions.add(snapshot);
}

export async function deleteBrand(id: string): Promise<void> {
  await db.brands.delete(id);
}

export async function getBrandVersions(
  brandId: string
): Promise<BrandVersionSnapshot[]> {
  return db.brandVersions
    .where("brand_id")
    .equals(brandId)
    .reverse()
    .sortBy("created_at");
}

export async function restoreBrandVersion(
  versionId: string
): Promise<BrandProfile | null> {
  const version = await db.brandVersions.get(versionId);
  if (!version) return null;

  const restored = {
    ...version.snapshot,
    updated_at: new Date().toISOString(),
  } as unknown as BrandProfile;

  await db.brands.put(restored as unknown as Record<string, unknown>);
  return restored;
}
