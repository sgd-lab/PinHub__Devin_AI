"use client";

import { useState, useRef } from "react";
import { Sparkles, Copy, Check, Save, Send, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useBrandStore } from "@/stores/brandStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useGeneratorStore } from "@/stores/generatorStore";
import { executeGeneration } from "@/lib/ai/executionPipeline";
import { retrieveApiKey } from "@/lib/encryption/keyStore";
import { toast } from "sonner";

export default function SinglePinGeneratorPage() {
  const { activeBrand } = useBrandStore();
  const { providers, defaultProvider } = useSettingsStore();
  const {
    currentRun, temperature, maxTokens, selectedNiche, targetDate, itemOverride,
    seasonalNote, boardAssignment, researchAllowed, holdForReview,
    setTemperature, setMaxTokens, setSelectedNiche, setTargetDate,
    setCurrentRun, resetRun, setHoldForReview,
  } = useGeneratorStore();

  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    if (!activeBrand) {
      toast.error("No brand profile loaded");
      return;
    }

    const provider = providers[selectedProvider];
    if (!provider) {
      toast.error("No provider selected");
      return;
    }

    const apiKey = retrieveApiKey(selectedProvider, "pinhub-default-key");
    if (!apiKey) {
      toast.error("No API key configured. Go to Settings → API Keys.");
      return;
    }

    resetRun();
    setOutput("");
    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      const result = await executeGeneration({
        brand: activeBrand,
        template: {
          id: "single-pin-default",
          name: "Maya Sofia — Single Outfit Collage Pin",
          version: "v2026.1",
          description: "Single outfit collage pin",
          prompt_text: `Generate a single outfit collage pin for ${activeBrand.identity.name}.
Niche: ${selectedNiche === "auto" ? activeBrand.niches[0]?.name : selectedNiche}
Target Item: ${itemOverride || "seasonal essential"}
Seasonal Note: ${seasonalNote || "current season"}
Date: ${targetDate}

Generate these sections:
## Session Context
## Outfit Brief
## SEO Title (max 100 chars)
## SEO Description (max 800 chars, include 2-4 hashtags)
## Version A Prompt (Illustrated/Collage style)
## Version B Prompt (Photorealistic with camera details)
## Canva Instructions

Brand voice: ${activeBrand.voice.power_words.join(", ")}
Model: ${activeBrand.model_persona.nano_banana_face_reference}
Palette: ${activeBrand.visual_system.palette.map(p => p.name).join(", ")}`,
          variable_bindings: {},
          output_schema: [
            { key: "title", label: "SEO Title", required: true },
            { key: "description", label: "SEO Description", required: true },
            { key: "prompt_a", label: "Version A Prompt", required: true },
            { key: "prompt_b", label: "Version B Prompt", required: true },
          ],
          compatible_generators: ["single"],
          qc_rules: [],
          estimated_input_tokens: 500,
          estimated_output_tokens: 2000,
          run_count: 0,
          average_qc_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        runtimeInputs: {
          target_item: itemOverride || "seasonal essential",
          seasonal_note: seasonalNote || "",
          niche: selectedNiche === "auto" ? (activeBrand.niches[0]?.name || "") : selectedNiche,
          country_set: "US, CA, UK",
        },
        provider: {
          name: selectedProvider,
          base_url: provider.base_url,
          api_key: apiKey,
          model: provider.default_model,
          fallback_model: provider.fallback_model,
        },
        temperature,
        maxTokens,
        niche: selectedNiche === "auto" ? (activeBrand.niches[0]?.name || "") : selectedNiche,
        targetDate,
        board: boardAssignment,
        runType: "single",
        holdForReview,
        onStageChange: (stage) => setCurrentRun({ status: stage as never }),
        onToken: (token) => setOutput((prev) => prev + token),
        onProgress: (percent) => setCurrentRun({ progress: percent }),
        onError: (error) => {
          toast.error(error.message);
          setStreaming(false);
        },
        signal: abortRef.current.signal,
      });

      setCurrentRun({
        status: "complete",
        parsedFields: result.parsedFields,
        qcResults: result.qcResults,
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
        costEstimate: result.usage.cost,
      });

      toast.success("Pin generated successfully!");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setStreaming(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied to clipboard");
  };

  const handleCopyNanoBanana = (prompt: string) => {
    const text = `[FACE REFERENCE: ${activeBrand?.model_persona.nano_banana_face_reference}]\n${prompt}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied for Nano Banana — paste into your image model.");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-deep-espresso">Single Pin Generator</h2>

          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Brand Profile</Label>
              <div className="px-4 py-2.5 bg-warm-ivory border border-warm-taupe/40 rounded-lg text-sm">
                {activeBrand?.identity.name || "No brand loaded"}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Niche Override</Label>
              <div className="flex gap-1.5 flex-wrap">
                {["auto", ...(activeBrand?.niches.map((n) => n.name) || [])].map((niche) => (
                  <button
                    key={niche}
                    onClick={() => setSelectedNiche(niche)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      selectedNiche === niche
                        ? "bg-deep-espresso text-warm-ivory"
                        : "bg-warm-ivory border border-warm-taupe/40 text-charcoal hover:bg-cream-hover"
                    }`}
                  >
                    {niche === "auto" ? "AUTO" : niche}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Target Date</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Item Override</Label>
              <Input
                value={itemOverride}
                onChange={(e) => useGeneratorStore.setState({ itemOverride: e.target.value })}
                placeholder="e.g., tailored blazer"
                className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Seasonal Note</Label>
              <Input
                value={seasonalNote}
                onChange={(e) => useGeneratorStore.setState({ seasonalNote: e.target.value })}
                placeholder="e.g., spring transition"
                className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">Research Allowed</Label>
              <Switch
                checked={researchAllowed}
                onCheckedChange={(checked) => useGeneratorStore.setState({ researchAllowed: checked })}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">AI Provider</Label>
              <div className="flex gap-1.5">
                {["nvidia", "openrouter"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedProvider(p)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors uppercase ${
                      selectedProvider === p
                        ? "bg-deep-espresso text-warm-ivory"
                        : "bg-warm-ivory border border-warm-taupe/40 text-charcoal hover:bg-cream-hover"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Temperature: {temperature.toFixed(2)}
              </Label>
              <Slider
                value={[temperature]}
                onValueChange={([val]) => setTemperature(val)}
                min={0}
                max={1.5}
                step={0.05}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Max Tokens: {maxTokens}
              </Label>
              <Slider
                value={[maxTokens]}
                onValueChange={([val]) => setMaxTokens(val)}
                min={500}
                max={8000}
                step={100}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">Hold for Review</Label>
              <Switch
                checked={holdForReview}
                onCheckedChange={setHoldForReview}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={streaming || !activeBrand}
              className="w-full bg-deep-espresso text-warm-ivory px-6 py-3 rounded-lg font-medium hover:bg-deep-espresso/90"
            >
              {streaming ? (
                <>Generating... {currentRun.progress}%</>
              ) : (
                <>
                  <Sparkles className="mr-2" size={16} />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-deep-espresso">Output</h2>

          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 min-h-[400px]">
            {!output && !streaming ? (
              <div className="flex flex-col items-center justify-center h-[350px] text-center text-charcoal">
                <Sparkles size={32} strokeWidth={1} className="text-warm-taupe mb-3" />
                <p className="text-sm">Fill in the inputs and press Generate.</p>
                <p className="text-xs text-warm-taupe mt-1">The output streams here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Streaming output */}
                <div className="prose prose-sm max-w-none">
                  {output.split(/(?=^## )/m).filter(Boolean).map((section, i) => {
                    const lines = section.split("\n");
                    const header = lines[0].replace(/^#+\s*/, "");
                    const body = lines.slice(1).join("\n").trim();
                    const isPrompt = header.toLowerCase().includes("prompt");

                    return (
                      <div key={i} className="bg-warm-ivory/50 border border-warm-taupe/20 rounded-lg p-4 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-serif text-sm font-semibold text-deep-espresso">{header}</h4>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleCopy(body, `section-${i}`)}
                              className="p-1 text-charcoal hover:text-deep-espresso"
                              title="Copy"
                            >
                              {copied === `section-${i}` ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            {isPrompt && (
                              <button
                                onClick={() => handleCopyNanoBanana(body)}
                                className="px-2 py-0.5 text-[10px] bg-muted-gold/20 text-muted-gold rounded font-medium hover:bg-muted-gold/30"
                                title="Copy for Nano Banana"
                              >
                                Copy for Nano Banana
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-charcoal whitespace-pre-wrap">{body}</div>
                        {header.toLowerCase().includes("title") && (
                          <div className={`text-xs mt-1 ${body.length > 100 ? "text-red-500" : "text-soft-sage"}`}>
                            {body.length}/100
                          </div>
                        )}
                        {header.toLowerCase().includes("description") && (
                          <div className={`text-xs mt-1 ${body.length > 800 ? "text-red-500" : "text-soft-sage"}`}>
                            {body.length}/800
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* QC Report */}
                {currentRun.qcResults && (
                  <div className="bg-warm-ivory/50 border border-warm-taupe/20 rounded-lg p-4">
                    <h4 className="font-serif text-sm font-semibold text-deep-espresso mb-2">
                      QC Report — Score: {currentRun.qcResults.score}/10
                    </h4>
                    <div className="space-y-1">
                      {currentRun.qcResults.rules.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-2 text-xs">
                          <span className={`w-2 h-2 rounded-full ${
                            rule.status === "pass" ? "bg-soft-sage" :
                            rule.status === "warn" ? "bg-muted-gold" : "bg-red-500"
                          }`} />
                          <span className="text-charcoal">{rule.id}</span>
                          {rule.message && <span className="text-warm-taupe">— {rule.message}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {currentRun.status === "complete" && (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="bg-deep-espresso text-warm-ivory rounded-lg">
                      <Save size={14} className="mr-1" /> Save to Library
                    </Button>
                    <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg">
                      <Send size={14} className="mr-1" /> Send to Notion
                    </Button>
                    <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg">
                      <Calendar size={14} className="mr-1" /> Add to Calendar
                    </Button>
                  </div>
                )}

                {/* Cost display */}
                {currentRun.costEstimate > 0 && (
                  <div className="text-xs text-charcoal">
                    Tokens: {currentRun.inputTokens} in / {currentRun.outputTokens} out &middot; Cost: ${currentRun.costEstimate.toFixed(4)}
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
