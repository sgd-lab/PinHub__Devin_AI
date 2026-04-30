"use client";

import { useState, useRef } from "react";
import { Sparkles, Copy, FileText, Calendar, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useBrandStore } from "@/stores/brandStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useGeneratorStore } from "@/stores/generatorStore";
import { executeGeneration } from "@/lib/ai/executionPipeline";
import { retrieveApiKey } from "@/lib/encryption/keyStore";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseAIError, type AIErrorInfo } from "@/lib/ai/aiErrorHandler";
import { AIErrorCard } from "@/components/ai/AIErrorCard";

export default function DailyProducerPage() {
  const { activeBrand } = useBrandStore();
  const { providers, defaultProvider } = useSettingsStore();
  const { temperature, maxTokens, targetDate, holdForReview, setTemperature, setCurrentRun, resetRun, setHoldForReview, currentRun } = useGeneratorStore();
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [countries, setCountries] = useState(["US", "CA", "UK"]);
  const [aiError, setAiError] = useState<AIErrorInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const today = new Date();
  const dayOfWeek = format(today, "EEEE");
  const todayDay = format(today, "EEE") as "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  const todayNiche = activeBrand?.niches.find((n) => n.rotation_days.includes(todayDay));

  const handleGenerate = async () => {
    if (!activeBrand) { toast.error("No brand loaded"); return; }
    const provider = providers[selectedProvider];
    const apiKey = retrieveApiKey(selectedProvider, "pinhub-default-key");
    if (!apiKey) { toast.error("No API key configured"); return; }

    resetRun();
    setOutput("");
    setAiError(null);
    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      const niche = todayNiche?.name || activeBrand.niches[0]?.name || "General";
      const result = await executeGeneration({
        brand: activeBrand,
        template: {
          id: "daily-3-pin-default",
          name: "Maya Sofia — 3-Pin Daily Producer",
          version: "v2026.2",
          description: "3 coordinated pins for the day",
          prompt_text: `Generate 3 coordinated Pinterest pins for ${activeBrand.identity.name}.
Day: ${dayOfWeek} | Niche: ${niche} | Countries: ${countries.join(", ")}

For each of the 3 pins, generate:
## Daily Context
## Pin 1 — HERO
### Title (max 100 chars)
### Description (max 800 chars with hashtags)
### Visual Prompt (Illustrated)
### Visual Prompt (Photorealistic)
## Pin 2 — DETAIL
### Title (max 100 chars)
### Description (max 800 chars with hashtags)
### Visual Prompt (Illustrated)
### Visual Prompt (Photorealistic)
## Pin 3 — LIFESTYLE
### Title (max 100 chars)
### Description (max 800 chars with hashtags)
### Visual Prompt (Illustrated)
### Visual Prompt (Photorealistic)

Brand: ${activeBrand.identity.tagline}
Model: ${activeBrand.model_persona.nano_banana_face_reference}
Palette: ${activeBrand.visual_system.palette.map(p => p.name).join(", ")}
Keywords: ${todayNiche?.keywords.join(", ") || ""}
Forbidden: ${todayNiche?.forbidden.join(", ") || ""}`,
          variable_bindings: {},
          output_schema: [
            { key: "title", label: "Title", required: true },
            { key: "description", label: "Description", required: true },
            { key: "prompt_a", label: "Visual Prompt A", required: true },
            { key: "prompt_b", label: "Visual Prompt B", required: true },
          ],
          compatible_generators: ["daily"],
          qc_rules: [],
          estimated_input_tokens: 800,
          estimated_output_tokens: 4000,
          run_count: 0,
          average_qc_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        runtimeInputs: { niche, country_set: countries.join(", ") },
        provider: { name: selectedProvider, base_url: provider.base_url, api_key: apiKey, model: provider.default_model },
        temperature,
        maxTokens: Math.max(maxTokens, 4000),
        niche,
        targetDate,
        runType: "daily",
        holdForReview,
        onStageChange: (stage) => setCurrentRun({ status: stage as never }),
        onToken: (token) => setOutput((prev) => prev + token),
        onProgress: (percent) => setCurrentRun({ progress: percent }),
        onError: (error) => { toast.error(error.message); setStreaming(false); },
        signal: abortRef.current.signal,
      });
      setCurrentRun({ status: "complete", qcResults: result.qcResults, costEstimate: result.usage.cost, inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens });
      toast.success("3 pins generated!");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const errorInfo = parseAIError(err, selectedProvider);
        setAiError(errorInfo);
        toast.error(errorInfo.message);
      }
    } finally { setStreaming(false); }
  };

  const handleCopyNanoBanana = (prompt: string) => {
    const text = `[FACE REFERENCE: ${activeBrand?.model_persona.nano_banana_face_reference}]\n${prompt}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied for Nano Banana — paste into your image model.");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-deep-espresso">3-Pin Daily Producer</h2>
          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-4">
            <div className="bg-dusty-rose/10 rounded-lg p-3">
              <div className="text-xs text-charcoal uppercase tracking-wider">{dayOfWeek}</div>
              <div className="font-medium text-deep-espresso">{todayNiche?.name || "No niche assigned"}</div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Countries</Label>
              <div className="flex gap-1.5 flex-wrap">
                {["US", "CA", "UK"].map((c) => (
                  <button key={c} onClick={() => setCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} className={`px-3 py-1.5 text-xs rounded-lg ${countries.includes(c) ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/40"}`}>{c}</button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">AI Provider</Label>
              <div className="flex gap-1.5">
                {["gemini", "openrouter", ...Object.keys(providers).filter(p => p !== "gemini" && p !== "openrouter")].filter(p => providers[p]?.enabled || providers[p]?.api_key_ref).map((p) => (
                  <button key={p} onClick={() => setSelectedProvider(p)} className={`px-3 py-1.5 text-xs rounded-lg uppercase ${selectedProvider === p ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/40"}`}>{p}{(p === "gemini" || p === "openrouter") ? " ★" : ""}</button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Temperature: {temperature.toFixed(2)}</Label>
              <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0} max={1.5} step={0.05} />
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">Hold for Review</Label>
              <Switch checked={holdForReview} onCheckedChange={setHoldForReview} />
            </div>

            <Button onClick={handleGenerate} disabled={streaming || !activeBrand} className="w-full bg-deep-espresso text-warm-ivory px-6 py-3 rounded-lg font-medium">
              {streaming ? <>Generating... {currentRun.progress}%</> : <><Sparkles className="mr-2" size={16} />Generate 3 Pins</>}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-deep-espresso">Output</h2>
          {aiError && (
            <div className="mb-4">
              <AIErrorCard error={aiError} onRetry={handleGenerate} onDismiss={() => setAiError(null)} />
            </div>
          )}
          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 min-h-[400px]">
            {!output && !streaming ? (
              <div className="flex flex-col items-center justify-center h-[350px] text-center text-charcoal">
                <Sparkles size={32} strokeWidth={1} className="text-warm-taupe mb-3" />
                <p className="text-sm">Configure and generate 3 pins for today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {output.split(/(?=^## )/m).filter(Boolean).map((section, i) => {
                  const lines = section.split("\n");
                  const header = lines[0].replace(/^#+\s*/, "");
                  const body = lines.slice(1).join("\n").trim();
                  const isPrompt = header.toLowerCase().includes("prompt");
                  return (
                    <div key={i} className="bg-warm-ivory/50 border border-warm-taupe/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-serif text-sm font-semibold text-deep-espresso">{header}</h4>
                        <div className="flex gap-1">
                          <button onClick={() => { navigator.clipboard.writeText(body); toast.success("Copied"); }} className="p-1 text-charcoal hover:text-deep-espresso"><Copy size={14} /></button>
                          {isPrompt && <button onClick={() => handleCopyNanoBanana(body)} className="px-2 py-0.5 text-[10px] bg-muted-gold/20 text-muted-gold rounded font-medium">Copy for Nano Banana</button>}
                        </div>
                      </div>
                      <div className="text-sm text-charcoal whitespace-pre-wrap">{body}</div>
                    </div>
                  );
                })}
                {currentRun.status === "complete" && (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg"><FileText size={14} className="mr-1" />Feed to Guide Generator</Button>
                    <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg"><Calendar size={14} className="mr-1" />Add All to Calendar</Button>
                    <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg"><Send size={14} className="mr-1" />Push to Notion</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
