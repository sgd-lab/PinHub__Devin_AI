"use client";

import { useState, useRef } from "react";
import { FileText, Sparkles, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBrandStore } from "@/stores/brandStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useGeneratorStore } from "@/stores/generatorStore";
import { executeGeneration } from "@/lib/ai/executionPipeline";
import { retrieveApiKey } from "@/lib/encryption/keyStore";
import { toast } from "sonner";
import { parseAIError, type AIErrorInfo } from "@/lib/ai/aiErrorHandler";
import { AIErrorCard } from "@/components/ai/AIErrorCard";

export default function GuideGeneratorPage() {
  const { activeBrand } = useBrandStore();
  const { providers, defaultProvider } = useSettingsStore();
  const { temperature, maxTokens, holdForReview, setCurrentRun, resetRun } = useGeneratorStore();
  const [guideTitle, setGuideTitle] = useState("");
  const [weekLabel, setWeekLabel] = useState("");
  const [monetization, setMonetization] = useState("Affiliate");
  const [pinSource, setPinSource] = useState("latest");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);
  const [aiError, setAiError] = useState<AIErrorInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    if (!activeBrand) { toast.error("No brand loaded"); return; }
    const provider = providers[selectedProvider];
    const apiKey = retrieveApiKey(selectedProvider, "pinhub-default-key");
    if (!apiKey) { toast.error("No API key configured. Go to Settings → API Keys."); return; }

    resetRun();
    setOutput("");
    setAiError(null);
    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      const result = await executeGeneration({
        brand: activeBrand,
        template: {
          id: "guide-generator-default",
          name: "Maya Sofia — Weekly PDF Guide",
          version: "v2026.3",
          description: "Weekly PDF guide from pin runs",
          prompt_text: `Generate a weekly style guide for ${activeBrand.identity.name}.
Title: ${guideTitle || `${activeBrand.identity.name} Weekly Style Guide`}
Week: ${weekLabel || "Current Week"}
Monetization Angle: ${monetization}

Create a comprehensive guide including:
## Guide Cover
## Style Philosophy This Week
## Featured Looks (3 outfit descriptions)
## Color Story
## Shopping Recommendations
## Styling Tips
## Social Media Captions (3)
## Hashtag Strategy

Brand: ${activeBrand.identity.tagline}
Voice: ${activeBrand.voice.power_words.join(", ")}
Palette: ${activeBrand.visual_system.palette.map(p => p.name).join(", ")}`,
          variable_bindings: {},
          output_schema: [
            { key: "title", label: "Guide Title", required: true },
            { key: "content", label: "Guide Content", required: true },
          ],
          compatible_generators: ["guide"],
          qc_rules: [],
          estimated_input_tokens: 600,
          estimated_output_tokens: 3000,
          run_count: 0,
          average_qc_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        runtimeInputs: {
          guide_title: guideTitle || "Weekly Style Guide",
          week_label: weekLabel || "Current Week",
          monetization_angle: monetization,
        },
        provider: { name: selectedProvider, base_url: provider.base_url, api_key: apiKey, model: provider.default_model },
        temperature,
        maxTokens: Math.max(maxTokens, 3000),
        niche: activeBrand.niches[0]?.name || "General",
        targetDate: new Date().toISOString().split("T")[0],
        runType: "guide",
        holdForReview,
        onStageChange: (stage) => setCurrentRun({ status: stage as never }),
        onToken: (token) => setOutput((prev) => prev + token),
        onProgress: (percent) => setCurrentRun({ progress: percent }),
        onError: (error) => { toast.error(error.message); setStreaming(false); },
        signal: abortRef.current.signal,
      });
      setCurrentRun({ status: "complete", qcResults: result.qcResults, costEstimate: result.usage.cost });
      toast.success("Guide generated!");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const errorInfo = parseAIError(err, selectedProvider);
        setAiError(errorInfo);
        toast.error(errorInfo.message);
      }
    } finally { setStreaming(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${guideTitle || "guide"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown exported");
  };

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
                {[
                  { value: "latest", label: "Use latest 3-Pin run" },
                  { value: "week", label: "Use this week's runs" },
                  { value: "library", label: "Select from Library..." },
                ].map((opt) => (
                  <button key={opt.value} onClick={() => setPinSource(opt.value)} className={`px-3 py-2 text-xs rounded-lg text-left ${pinSource === opt.value ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/40 hover:bg-cream-hover"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Monetization Angle</Label>
              <div className="flex gap-1.5">
                {["Affiliate", "Brand Deal", "Community"].map((a) => (
                  <button key={a} onClick={() => setMonetization(a)} className={`px-3 py-1.5 text-xs rounded-lg ${monetization === a ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/40 hover:bg-cream-hover"}`}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">AI Provider</Label>
              <div className="flex gap-1.5">
                {Object.keys(providers).filter(p => providers[p]?.enabled).map((p) => (
                  <button key={p} onClick={() => setSelectedProvider(p)} className={`px-3 py-1.5 text-xs rounded-lg uppercase ${selectedProvider === p ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/40 hover:bg-cream-hover"}`}>{p}</button>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={streaming || !activeBrand} className="w-full bg-deep-espresso text-warm-ivory px-6 py-3 rounded-lg font-medium">
              <Sparkles className="mr-2" size={16} />{streaming ? "Generating..." : "Generate Guide"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-deep-espresso">Guide Preview</h2>
          {aiError && (
            <div className="mb-4">
              <AIErrorCard error={aiError} onRetry={handleGenerate} onDismiss={() => setAiError(null)} />
            </div>
          )}
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
              <Button size="sm" variant="outline" onClick={handleCopy} className="border-warm-taupe rounded-lg">
                {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}{copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportMarkdown} className="border-warm-taupe rounded-lg"><Download size={14} className="mr-1" />Export Markdown</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
