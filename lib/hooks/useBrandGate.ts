"use client";

import { useEffect, useState } from "react";
import { useBrandStore } from "@/stores/brandStore";
import { loadMayaSofiaDefaults } from "@/lib/brands/brandDefaults";
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
      addBrand(defaults);
      setActiveBrand(defaults.id);
      toast.info("Default brand profile created. Edit it in Brand Profiles.");
    } else if (!activeBrand && brands.length > 0) {
      setActiveBrand(brands[0].id);
    }
    setReady(true);
  }, [brands, activeBrand, addBrand, setActiveBrand]);

  return { ready, hasBrand: !!activeBrand || brands.length > 0 };
}
