"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Save, Play, AlertCircle, CheckCircle2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { extractVariables } from "@/lib/prompts/variableResolver";
import { useBrandStore } from "@/stores/brandStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { retrieveApiKey } from "@/lib/encryption/keyStore";
import { toast } from "sonner";

const DEFAULT_PROMPTS: Record<string, string> = {
  "single-pin-default": `# Maya Sofia — Single Outfit Collage Pin v2026.1

{brand.name} — {niche.name}

## Session Context
Date: {today.date} | Day: {today.day}
Target Item: {target_item}
Seasonal Note: {seasonal_note}
Countries: {country_set}

## Outfit Brief
Create a complete outfit collage pin featuring {target_item}.

## SEO Title (max 100 chars)
## SEO Description (max 800 chars, include 2-4 hashtags)
## Version A Prompt (Illustrated/Collage style)
## Version B Prompt (Photorealistic with camera details)
## Canva Instructions`,

  "daily-3-pin-default": `# Maya Sofia — 3-Pin Daily Producer v2026.2

{brand.name} — {niche.name}
Day: {today.day} | Countries: {country_set}

Generate 3 coordinated pins:
## Pin 1 — HERO
## Pin 2 — DETAIL
## Pin 3 — LIFESTYLE

Each pin needs:
### Title (max 100 chars)
### Description (max 800 chars with hashtags)
### Visual Prompt (Illustrated)
### Visual Prompt (Photorealistic)`,

  "guide-generator-default": `# Maya Sofia — Weekly PDF Guide v2026.3

{brand.name} — Weekly Style Guide
Week: {week_label}
Monetization: {monetization_angle}

## Guide Cover
## Style Philosophy This Week
## Featured Looks (3 outfit descriptions)
## Color Story
## Shopping Recommendations
## Styling Tips
## Social Media Captions (3)
## Hashtag Strategy`,
};

export default function PromptEditorPage() {
  const params = useParams();
  const promptId = params.id as string;
  const { activeBrand } = useBrandStore();
  const { providers, defaultProvider } = useSettingsStore();

  const [promptText, setPromptText] = useState("");
  const [sandboxOutput, setSandboxOutput] = useState("");
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`pinhub_prompt_${promptId}`);
    if (stored) {
      setPromptText(stored);
    } else {
      setPromptText(DEFAULT_PROMPTS[promptId] || "# New Prompt Template\n\n{brand.name} — {niche.name}\n\n## Output Section 1\n## Output Section 2");
    }
  }, [promptId]);

  const variables = extractVariables(promptText);
  const knownVars = ["brand.name", "brand.tagline", "brand.mission", "niche.name", "niche.keywords", "niche.hero_pieces", "niche.hook", "niche.color_story", "model.description", "model.nano_banana", "today.date", "today.day", "target_item", "seasonal_note", "country_set", "palette.names", "voice.power_words", "voice.signature_openers", "seo.hashtags", "monetization_angle", "guide_title", "week_label"];
  const resolved = variables.filter((v) => knownVars.includes(v));
  const unresolved = variables.filter((v) => !knownVars.includes(v));

  const handleSave = () => {
    localStorage.setItem(`pinhub_prompt_${promptId}`, promptText);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success("Prompt saved");
  };

  const handleTest = async () => {
    if (!activeBrand) { toast.error("No brand loaded"); return; }
    const apiKey = retrieveApiKey(defaultProvider, "pinhub-default-key");
    if (!apiKey) { toast.error("No API key configured. Go to Settings → API Keys."); return; }
    const provider = providers[defaultProvider];

    setTesting(true);
    setSandboxOutput("");
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: provider.base_url,
          apiKey,
          model: provider.default_model,
          messages: [
            { role: "system", content: `You are testing a prompt template for ${activeBrand.identity.name}. Generate a brief sample output.` },
            { role: "user", content: promptText.slice(0, 2000) },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9,
          stream: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No body");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) setSandboxOutput((prev) => prev + content);
          } catch { /* skip */ }
        }
      }
      toast.success("Test complete");
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error(String(err));
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sandboxOutput || promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-deep-espresso">Prompt Editor — {promptId}</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy} className="border-warm-taupe rounded-lg text-xs">
            {copied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}{copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="border-warm-taupe rounded-lg text-xs">
            <Play size={12} className="mr-1" />{testing ? "Testing..." : "Test in Sandbox"}
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-deep-espresso text-warm-ivory rounded-lg text-xs">
            {saved ? <Check size={12} className="mr-1" /> : <Save size={12} className="mr-1" />}{saved ? "Saved!" : "Save Version"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
            <Label className="text-sm font-medium mb-2 block">Prompt Template</Label>
            <Textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={20} className="bg-warm-ivory border-warm-taupe/40 rounded-lg font-mono text-sm" />
            <div className="flex justify-between mt-2 text-xs text-charcoal">
              <span>{promptText.length} chars</span>
              <span>~{Math.ceil(promptText.length / 4)} tokens estimated</span>
            </div>
          </div>

          {sandboxOutput && (
            <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
              <Label className="text-sm font-medium mb-2 block">Sandbox Output</Label>
              <div className="bg-warm-ivory border border-warm-taupe/40 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-80 overflow-y-auto">
                {sandboxOutput}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-deep-espresso mb-3">Variable Inspector</h3>
            <div className="space-y-1.5">
              {resolved.map((v) => (
                <div key={v} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 size={12} className="text-soft-sage" />
                  <code className="text-charcoal">{`{${v}}`}</code>
                </div>
              ))}
              {unresolved.map((v) => (
                <div key={v} className="flex items-center gap-2 text-xs">
                  <AlertCircle size={12} className="text-red-500" />
                  <code className="text-red-600">{`{${v}}`}</code>
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Missing</span>
                </div>
              ))}
              {variables.length === 0 && (
                <p className="text-xs text-warm-taupe">No variables found</p>
              )}
            </div>
          </div>

          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-deep-espresso mb-2">Output Schema</h3>
            <div className="space-y-1 text-xs text-charcoal">
              {["title", "description", "hashtags", "prompt_a", "prompt_b", "canva_instructions"].map((f) => (
                <div key={f} className="flex items-center gap-2 px-2 py-1 bg-warm-ivory rounded">
                  <span className="font-mono">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-deep-espresso mb-2">QC Rules</h3>
            <p className="text-xs text-charcoal">Attach QC rules to validate output fields.</p>
            <Button size="sm" variant="outline" className="mt-2 w-full border-warm-taupe rounded-lg text-xs" onClick={() => toast.info("QC rules are applied automatically during generation")}>Manage Rules</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
