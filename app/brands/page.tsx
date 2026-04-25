"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandStore } from "@/stores/brandStore";
import { loadMayaSofiaDefaults } from "@/lib/brands/brandDefaults";
import { exportBrandToJSON } from "@/lib/exports/jsonExporter";
import { toast } from "sonner";

export default function BrandsPage() {
  const { brands, activeBrandId, setActiveBrand, cloneBrand, addBrand } = useBrandStore();
  const router = useRouter();

  const handleNewBrand = () => {
    const defaults = JSON.parse(JSON.stringify(loadMayaSofiaDefaults()));
    defaults.id = crypto.randomUUID();
    defaults.identity = { ...defaults.identity, name: "New Brand", tagline: "Your brand tagline" };
    defaults.created_at = new Date().toISOString();
    defaults.updated_at = new Date().toISOString();
    addBrand(defaults);
    toast.success("New brand created");
    router.push(`/brands/${defaults.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-deep-espresso">Brand Profiles</h2>
        <Button onClick={handleNewBrand} className="bg-deep-espresso text-warm-ivory rounded-lg">
          <Plus size={14} className="mr-1" />New Brand
        </Button>
      </div>

      {brands.length === 0 ? (
        <div className="text-center py-16 text-charcoal">
          <p>No brand profiles yet. Complete onboarding to load Maya Sofia defaults.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {brands.map((brand) => (
            <div key={brand.id} className={`bg-white/60 border rounded-lg p-5 ${brand.id === activeBrandId ? "border-dusty-rose" : "border-warm-taupe/30"}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-serif text-lg text-deep-espresso">{brand.identity.name}</h3>
                  <p className="text-sm text-charcoal">{brand.identity.tagline}</p>
                </div>
                {brand.id === activeBrandId && (
                  <span className="text-[10px] bg-dusty-rose/20 text-dusty-rose px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                )}
              </div>

              <div className="flex gap-1 mb-3">
                {brand.visual_system.palette.map((c) => (
                  <div key={c.hex} className="w-6 h-6 rounded border border-warm-taupe/20" style={{ backgroundColor: c.hex }} title={c.name} />
                ))}
              </div>

              <div className="flex gap-1 mb-3 flex-wrap">
                {brand.niches.map((n) => (
                  <span key={n.id} className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider bg-warm-ivory border border-warm-taupe/20">{n.name}</span>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Link href={`/brands/${brand.id}`}>
                  <Button size="sm" className="bg-deep-espresso text-warm-ivory rounded-lg text-xs">Edit</Button>
                </Link>
                {brand.id !== activeBrandId && (
                  <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs" onClick={() => { setActiveBrand(brand.id); toast.success(`Switched to ${brand.identity.name}`); }}>Set Active</Button>
                )}
                <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs" onClick={() => { cloneBrand(brand.id); toast.success("Brand cloned"); }}><Copy size={12} className="mr-1" />Clone</Button>
                <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs" onClick={() => exportBrandToJSON(brand as unknown as Record<string, unknown>)}><Download size={12} className="mr-1" />Export</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
