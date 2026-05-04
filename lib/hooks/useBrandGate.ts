"use client";

import { useEffect, useState } from "react";
import { useBrandStore } from "@/stores/brandStore";
import { loadMayaSofiaDefaults } from "@/lib/brands/brandDefaults";
import { saveBrand } from "@/lib/db/brandRepository";
import { toast } from "sonner";

export function useBrandGate() {
  const { brands, activeBrand, addBrand, setActiveBrand } = useBrandStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (brands.length === 0) {
      const defaults = JSON.parse(JSON.stringify(loadMayaSofiaDefaults()));
      defaults.id = crypto.randomUUID();
      defaults.created_at = new Date().toISOString();
      defaults.updated_at = new Date().toISOString();

      // Persist to Supabase first, then add to local store
      (async () => {
        try {
          await saveBrand(defaults);
        } catch {
          // Supabase unreachable — fall through to local-only store
        }
        addBrand(defaults);
        setActiveBrand(defaults.id);
        toast.info("Default brand profile created. Edit it in Brand Profiles.");
        setReady(true);
      })();
      return;
    } else if (!activeBrand && brands.length > 0) {
      setActiveBrand(brands[0].id);
    }
    setReady(true);
  }, [brands, activeBrand, addBrand, setActiveBrand]);

  return { ready, hasBrand: !!activeBrand || brands.length > 0 };
}
