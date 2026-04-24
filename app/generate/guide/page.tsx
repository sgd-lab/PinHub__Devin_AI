"use client";

import { useState } from "react";
import { FileText, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBrandStore } from "@/stores/brandStore";

export default function GuideGeneratorPage() {
  const { activeBrand } = useBrandStore();
  const [guideTitle, setGuideTitle] = useState("");
  const [weekLabel, setWeekLabel] = useState("");
  const [output] = useState("");
  const [streaming] = useState(false);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-deep-espresso">Guide Generator</h2>
          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Brand</Label>
              <div className="px-4 py-2.5 bg-warm-ivory border border-warm-taupe/40 rounded-lg text-sm">
                {activeBrand?.identity.name || "No brand loaded"}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Guide Title Override</Label>
              <Input value={guideTitle} onChange={(e) => setGuideTitle(e.target.value)} placeholder="e.g., Week 12 Style Guide" className="bg-warm-ivory border-warm-taupe/40 rounded-lg" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Week/Month Label</Label>
              <Input value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} placeholder="e.g., March Week 3" className="bg-warm-ivory border-warm-taupe/40 rounded-lg" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Pin Source</Label>
              <div className="flex flex-col gap-1.5">
                <button className="px-3 py-2 text-xs rounded-lg bg-deep-espresso text-warm-ivory text-left">Use latest 3-Pin run</button>
                <button className="px-3 py-2 text-xs rounded-lg bg-warm-ivory border border-warm-taupe/40 text-left">Use this week&apos;s runs</button>
                <button className="px-3 py-2 text-xs rounded-lg bg-warm-ivory border border-warm-taupe/40 text-left">Select from Library...</button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Monetization Angle</Label>
              <div className="flex gap-1.5">
                {["Affiliate", "Brand Deal", "Community"].map((a) => (
                  <button key={a} className="px-3 py-1.5 text-xs rounded-lg bg-warm-ivory border border-warm-taupe/40 hover:bg-cream-hover">{a}</button>
                ))}
              </div>
            </div>
            <Button disabled={streaming || !activeBrand} className="w-full bg-deep-espresso text-warm-ivory px-6 py-3 rounded-lg font-medium">
              <Sparkles className="mr-2" size={16} />Generate Guide
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-deep-espresso">Guide Preview</h2>
          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 min-h-[400px]">
            {!output ? (
              <div className="flex flex-col items-center justify-center h-[350px] text-center text-charcoal">
                <FileText size={32} strokeWidth={1} className="text-warm-taupe mb-3" />
                <p className="text-sm">Select pin sources and generate your weekly guide.</p>
                <p className="text-xs text-warm-taupe mt-1">The guide renders with brand typography.</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-charcoal">{output}</div>
            )}
          </div>
          {output && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg"><Download size={14} className="mr-1" />Export PDF</Button>
              <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg"><Download size={14} className="mr-1" />Export Markdown</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
