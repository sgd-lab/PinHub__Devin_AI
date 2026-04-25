import mayaSofiaDefaults from "@/data/defaults/maya-sofia.brand.json";
import type { BrandProfile } from "./brandSchema";

export function loadMayaSofiaDefaults(): BrandProfile {
  return {
    ...mayaSofiaDefaults,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as BrandProfile;
}

export { mayaSofiaDefaults };
