"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Save, RotateCcw, Copy, Download, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useBrandStore } from "@/stores/brandStore";
import { saveBrand } from "@/lib/db/brandRepository";
import { loadMayaSofiaDefaults } from "@/lib/brands/brandDefaults";
import { exportBrandToJSON } from "@/lib/exports/jsonExporter";
import type { BrandProfile } from "@/lib/brands/brandSchema";
import { toast } from "sonner";

const subNav = [
  { id: "identity", label: "Identity" },
  { id: "visual", label: "Visual System" },
  { id: "voice", label: "Voice" },
  { id: "niches", label: "Niches" },
  { id: "pinterest", label: "Pinterest Setup" },
  { id: "seo", label: "SEO Profile" },
];

export default function BrandEditorPage() {
  const params = useParams();
  const brandId = params.id as string;
  const { brands, updateBrand } = useBrandStore();
  const [activeSection, setActiveSection] = useState("identity");
  const [brand, setBrand] = useState<BrandProfile | null>(null);

  useEffect(() => {
    const found = brands.find((b) => b.id === brandId);
    if (found) setBrand({ ...found });
  }, [brandId, brands]);

  if (!brand) return <div className="text-center py-16 text-charcoal">Brand not found</div>;

  const handleSave = async () => {
    const updated = { ...brand, updated_at: new Date().toISOString() };
    updateBrand(brand.id, updated);
    await saveBrand(updated);
    toast.success("Brand profile saved");
  };

  const handleReset = async () => {
    if (!confirm("Reset to Maya Sofia defaults? This will overwrite your current changes.")) return;
    const defaults = loadMayaSofiaDefaults();
    defaults.id = brand.id;
    setBrand(defaults);
    updateBrand(brand.id, defaults);
    await saveBrand(defaults);
    toast.success("Reset to Maya Sofia defaults");
  };

  const updateField = (path: string, value: unknown) => {
    const parts = path.split(".");
    const updated = JSON.parse(JSON.stringify(brand));
    let current = updated;
    for (let i = 0; i < parts.length - 1; i++) current = current[parts[i]];
    current[parts[parts.length - 1]] = value;
    setBrand(updated);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="text-sm text-charcoal">
          <span className="text-warm-taupe">Atelier</span> / <span className="text-warm-taupe">Brand Profiles</span> / <span className="font-medium text-deep-espresso">{brand.identity.name}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleReset} className="border-warm-taupe rounded-lg text-xs"><RotateCcw size={12} className="mr-1" />Reset to Defaults</Button>
          <Button size="sm" variant="outline" onClick={() => useBrandStore.getState().cloneBrand(brand.id)} className="border-warm-taupe rounded-lg text-xs"><Copy size={12} className="mr-1" />Clone</Button>
          <Button size="sm" variant="outline" onClick={() => exportBrandToJSON(brand as unknown as Record<string, unknown>)} className="border-warm-taupe rounded-lg text-xs"><Download size={12} className="mr-1" />Export JSON</Button>
          <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs"><History size={12} className="mr-1" />Version History</Button>
          <Button size="sm" onClick={handleSave} className="bg-deep-espresso text-warm-ivory rounded-lg text-xs"><Save size={12} className="mr-1" />Save</Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sub-nav */}
        <div className="w-44 shrink-0 space-y-1">
          {subNav.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${activeSection === item.id ? "bg-deep-espresso text-warm-ivory" : "text-charcoal hover:bg-cream-hover"}`}>
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white/60 border border-warm-taupe/30 rounded-lg p-6 space-y-5">
          {activeSection === "identity" && (
            <>
              <h3 className="font-serif text-xl text-deep-espresso">Identity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm font-medium mb-1 block">Brand Name</Label><Input value={brand.identity.name} onChange={(e) => updateField("identity.name", e.target.value)} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
                <div><Label className="text-sm font-medium mb-1 block">Tagline</Label><Input value={brand.identity.tagline} onChange={(e) => updateField("identity.tagline", e.target.value)} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
                <div><Label className="text-sm font-medium mb-1 block">One Word</Label><Input value={brand.identity.one_word} onChange={(e) => updateField("identity.one_word", e.target.value)} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
                <div><Label className="text-sm font-medium mb-1 block">Operator Name</Label><Input value={brand.identity.operator_name} onChange={(e) => updateField("identity.operator_name", e.target.value)} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
                <div><Label className="text-sm font-medium mb-1 block">Primary Market</Label><Input value={brand.identity.primary_market} onChange={(e) => updateField("identity.primary_market", e.target.value)} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
              </div>
              <div><Label className="text-sm font-medium mb-1 block">Mission Statement</Label><Textarea value={brand.identity.mission_statement} onChange={(e) => updateField("identity.mission_statement", e.target.value)} rows={4} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
            </>
          )}

          {activeSection === "visual" && (
            <>
              <h3 className="font-serif text-xl text-deep-espresso">Visual System</h3>
              <div>
                <Label className="text-sm font-medium mb-2 block">Palette</Label>
                <div className="flex gap-3 flex-wrap">
                  {brand.visual_system.palette.map((color, i) => (
                    <div key={i} className="text-center">
                      <div className="w-16 h-16 rounded-lg border border-warm-taupe/20 mb-1 cursor-pointer" style={{ backgroundColor: color.hex }} />
                      <div className="text-[10px] text-charcoal">{color.name}</div>
                      <Input value={color.hex} onChange={(e) => { const p = [...brand.visual_system.palette]; p[i] = { ...p[i], hex: e.target.value }; updateField("visual_system.palette", p); }} className="w-16 text-[10px] bg-warm-ivory border-warm-taupe/40 rounded px-1 py-0.5 mt-0.5 text-center" />
                    </div>
                  ))}
                </div>
              </div>
              <div><Label className="text-sm font-medium mb-1 block">Keywords</Label><Input value={brand.visual_system.keywords.join(", ")} onChange={(e) => updateField("visual_system.keywords", e.target.value.split(",").map(s => s.trim()))} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
              <div><Label className="text-sm font-medium mb-1 block">Never Use</Label><Input value={brand.visual_system.never.join(", ")} onChange={(e) => updateField("visual_system.never", e.target.value.split(",").map(s => s.trim()))} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
            </>
          )}

          {activeSection === "voice" && (
            <>
              <h3 className="font-serif text-xl text-deep-espresso">Voice</h3>
              <div><Label className="text-sm font-medium mb-1 block">Register</Label><Textarea value={brand.voice.register} onChange={(e) => updateField("voice.register", e.target.value)} rows={2} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
              <div><Label className="text-sm font-medium mb-1 block">Audience Address</Label><Input value={brand.voice.audience_address} onChange={(e) => updateField("voice.audience_address", e.target.value)} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
              <div><Label className="text-sm font-medium mb-1 block">Signature Openers</Label><Textarea value={brand.voice.signature_openers.join("\n")} onChange={(e) => updateField("voice.signature_openers", e.target.value.split("\n").filter(Boolean))} rows={4} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
              <div><Label className="text-sm font-medium mb-1 block">Power Words</Label><Input value={brand.voice.power_words.join(", ")} onChange={(e) => updateField("voice.power_words", e.target.value.split(",").map(s => s.trim()))} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
            </>
          )}

          {activeSection === "niches" && (
            <>
              <h3 className="font-serif text-xl text-deep-espresso">Niches</h3>
              <Accordion type="single" collapsible>
                {brand.niches.map((niche, ni) => (
                  <AccordionItem key={niche.id} value={niche.id}>
                    <AccordionTrigger className="text-sm font-medium">{niche.name}</AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      <div><Label className="text-xs mb-1 block">Hook</Label><Input value={niche.hook} onChange={(e) => { const n = [...brand.niches]; n[ni] = { ...n[ni], hook: e.target.value }; updateField("niches", n); }} className="bg-warm-ivory border-warm-taupe/40 rounded-lg text-sm" /></div>
                      <div><Label className="text-xs mb-1 block">Keywords</Label><Input value={niche.keywords.join(", ")} onChange={(e) => { const n = [...brand.niches]; n[ni] = { ...n[ni], keywords: e.target.value.split(",").map(s => s.trim()) }; updateField("niches", n); }} className="bg-warm-ivory border-warm-taupe/40 rounded-lg text-sm" /></div>
                      <div><Label className="text-xs mb-1 block">Forbidden Words</Label><Input value={niche.forbidden.join(", ")} onChange={(e) => { const n = [...brand.niches]; n[ni] = { ...n[ni], forbidden: e.target.value.split(",").map(s => s.trim()) }; updateField("niches", n); }} className="bg-warm-ivory border-warm-taupe/40 rounded-lg text-sm" /></div>
                      <div><Label className="text-xs mb-1 block">Rotation Days</Label><div className="flex gap-1">{(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] as const).map(d => (<button key={d} onClick={() => { const n = [...brand.niches]; const days = n[ni].rotation_days.includes(d) ? n[ni].rotation_days.filter(x => x !== d) : [...n[ni].rotation_days, d]; n[ni] = { ...n[ni], rotation_days: days as typeof niche.rotation_days }; updateField("niches", n); }} className={`px-2 py-1 text-xs rounded ${niche.rotation_days.includes(d) ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/30"}`}>{d}</button>))}</div></div>
                      <div><Label className="text-xs mb-1 block">Hero Pieces</Label><Input value={niche.hero_pieces.join(", ")} onChange={(e) => { const n = [...brand.niches]; n[ni] = { ...n[ni], hero_pieces: e.target.value.split(",").map(s => s.trim()) }; updateField("niches", n); }} className="bg-warm-ivory border-warm-taupe/40 rounded-lg text-sm" /></div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </>
          )}

          {activeSection === "pinterest" && (
            <>
              <h3 className="font-serif text-xl text-deep-espresso">Pinterest Setup</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm font-medium mb-1 block">Profile Name</Label><Input value={brand.pinterest.profile_name} onChange={(e) => updateField("pinterest.profile_name", e.target.value)} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
                <div><Label className="text-sm font-medium mb-1 block">URL</Label><Input value={brand.pinterest.url} onChange={(e) => updateField("pinterest.url", e.target.value)} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
              </div>
              <div><Label className="text-sm font-medium mb-1 block">Bio</Label><Textarea value={brand.pinterest.bio} onChange={(e) => updateField("pinterest.bio", e.target.value)} rows={2} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
              <div><Label className="text-sm font-medium mb-1 block">Default Hashtags</Label><Input value={brand.pinterest.default_hashtags.join(", ")} onChange={(e) => updateField("pinterest.default_hashtags", e.target.value.split(",").map(s => s.trim()))} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
              <div><Label className="text-sm font-medium mb-1 block">File Naming Template</Label><Input value={brand.file_naming.template} onChange={(e) => updateField("file_naming.template", e.target.value)} className="bg-warm-ivory border-warm-taupe/40 rounded-lg font-mono text-sm" /></div>
            </>
          )}

          {activeSection === "seo" && (
            <>
              <h3 className="font-serif text-xl text-deep-espresso">SEO Profile</h3>
              <div><Label className="text-sm font-medium mb-1 block">Long-tail Keyword Bank</Label><Textarea value={brand.seo.longtail_bank.join("\n")} onChange={(e) => updateField("seo.longtail_bank", e.target.value.split("\n").filter(Boolean))} rows={4} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
              <div><Label className="text-sm font-medium mb-1 block">Competitor Boards</Label><Textarea value={brand.seo.competitor_boards.join("\n")} onChange={(e) => updateField("seo.competitor_boards", e.target.value.split("\n").filter(Boolean))} rows={3} className="bg-warm-ivory border-warm-taupe/40 rounded-lg" /></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
