"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUIStore } from "@/stores/uiStore";

export default function UIPage() {
  const { theme, fontSize, density, libraryDefaultView, streamingAnimation, setTheme, setFontSize, setDensity, setLibraryDefaultView, setStreamingAnimation, costMeterVisible, toggleCostMeter } = useUIStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif text-deep-espresso mb-1">UI Preferences</h3>
        <p className="text-xs text-charcoal">Customize the look and feel of your atelier workspace.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <Label className="text-sm font-medium mb-2 block">Theme</Label>
          <div className="flex gap-2">
            {(["warm-ivory", "dark-atelier"] as const).map((t) => (
              <button key={t} onClick={() => setTheme(t)} className={`px-4 py-2 rounded-lg text-sm ${theme === t ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/40 text-charcoal"}`}>
                {t === "warm-ivory" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <Label className="text-sm font-medium mb-2 block">Font Size</Label>
          <div className="flex gap-2">
            {(["sm", "md", "lg"] as const).map((s) => (
              <button key={s} onClick={() => setFontSize(s)} className={`px-4 py-2 rounded-lg text-sm ${fontSize === s ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/40 text-charcoal"}`}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <Label className="text-sm font-medium mb-2 block">Card Density</Label>
          <div className="flex gap-2">
            {(["compact", "comfortable", "spacious"] as const).map((d) => (
              <button key={d} onClick={() => setDensity(d)} className={`px-4 py-2 rounded-lg text-sm capitalize ${density === d ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/40 text-charcoal"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <Label className="text-sm font-medium mb-2 block">Default Library View</Label>
          <div className="flex gap-2">
            {(["grid", "list", "compact"] as const).map((v) => (
              <button key={v} onClick={() => setLibraryDefaultView(v)} className={`px-4 py-2 rounded-lg text-sm capitalize ${libraryDefaultView === v ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/40 text-charcoal"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4 flex items-center justify-between">
          <div><Label className="text-sm font-medium">Streaming Animation</Label><p className="text-xs text-charcoal mt-0.5">Show token-by-token typing effect</p></div>
          <Switch checked={streamingAnimation} onCheckedChange={setStreamingAnimation} />
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4 flex items-center justify-between">
          <div><Label className="text-sm font-medium">Cost Meter</Label><p className="text-xs text-charcoal mt-0.5">Show floating cost meter in bottom-right</p></div>
          <Switch checked={costMeterVisible} onCheckedChange={toggleCostMeter} />
        </div>
      </div>
    </div>
  );
}
