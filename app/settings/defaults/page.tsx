"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore } from "@/stores/settingsStore";
import { useBrandStore } from "@/stores/brandStore";

export default function DefaultsPage() {
  const { defaultProvider, budgetThreshold, setBudgetThreshold, setDefaultProvider } = useSettingsStore();
  const { brands, activeBrandId, setActiveBrand } = useBrandStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif text-deep-espresso mb-1">Defaults</h3>
        <p className="text-xs text-charcoal">Configure default settings for generation and workflow.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <Label className="text-sm font-medium mb-2 block">Default Brand</Label>
          <select value={activeBrandId || ""} onChange={(e) => setActiveBrand(e.target.value)} className="w-full text-sm bg-warm-ivory border border-warm-taupe/40 rounded-lg px-3 py-2">
            {brands.map((b) => <option key={b.id} value={b.id}>{b.identity.name}</option>)}
          </select>
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <Label className="text-sm font-medium mb-2 block">Default Provider</Label>
          <select value={defaultProvider} onChange={(e) => setDefaultProvider(e.target.value)} className="w-full text-sm bg-warm-ivory border border-warm-taupe/40 rounded-lg px-3 py-2">
            {["nvidia", "openrouter", "gemini", "groq", "anthropic", "ollama"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <Label className="text-sm font-medium mb-2 block">Budget Threshold: ${budgetThreshold}</Label>
          <Slider value={[budgetThreshold]} onValueChange={([v]) => setBudgetThreshold(v)} min={0.5} max={50} step={0.5} />
          <p className="text-xs text-charcoal mt-1">Warn before generation if estimated cost exceeds this amount.</p>
        </div>
      </div>
    </div>
  );
}
