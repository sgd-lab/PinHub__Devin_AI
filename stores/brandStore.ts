"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BrandProfile } from "@/lib/brands/brandSchema";

interface BrandState {
  brands: BrandProfile[];
  activeBrandId: string;
  activeBrand: BrandProfile | null;
  setBrands: (brands: BrandProfile[]) => void;
  addBrand: (brand: BrandProfile) => void;
  updateBrand: (id: string, updates: Partial<BrandProfile>) => void;
  setActiveBrand: (id: string) => void;
  removeBrand: (id: string) => void;
  cloneBrand: (id: string) => BrandProfile | null;
}

export const useBrandStore = create<BrandState>()(
  persist(
    (set, get) => ({
      brands: [],
      activeBrandId: "",
      activeBrand: null,
      setBrands: (brands) => {
        const active = brands.find((b) => b.id === get().activeBrandId) || brands[0] || null;
        set({ brands, activeBrand: active });
      },
      addBrand: (brand) =>
        set((s) => {
          const brands = [...s.brands, brand];
          return {
            brands,
            activeBrand: s.activeBrand || brand,
            activeBrandId: s.activeBrandId || brand.id,
          };
        }),
      updateBrand: (id, updates) =>
        set((s) => {
          const brands = s.brands.map((b) =>
            b.id === id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b
          );
          const activeBrand =
            s.activeBrandId === id
              ? brands.find((b) => b.id === id) || s.activeBrand
              : s.activeBrand;
          return { brands, activeBrand };
        }),
      setActiveBrand: (id) =>
        set((s) => ({
          activeBrandId: id,
          activeBrand: s.brands.find((b) => b.id === id) || null,
        })),
      removeBrand: (id) =>
        set((s) => {
          const brands = s.brands.filter((b) => b.id !== id);
          return {
            brands,
            activeBrandId: s.activeBrandId === id ? (brands[0]?.id || "") : s.activeBrandId,
            activeBrand:
              s.activeBrandId === id
                ? brands[0] || null
                : s.activeBrand,
          };
        }),
      cloneBrand: (id) => {
        const brand = get().brands.find((b) => b.id === id);
        if (!brand) return null;
        const cloned: BrandProfile = {
          ...JSON.parse(JSON.stringify(brand)),
          id: crypto.randomUUID(),
          identity: {
            ...brand.identity,
            name: `${brand.identity.name} Copy`,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((s) => ({ brands: [...s.brands, cloned] }));
        return cloned;
      },
    }),
    { name: "pinhub-brand-store" }
  )
);
