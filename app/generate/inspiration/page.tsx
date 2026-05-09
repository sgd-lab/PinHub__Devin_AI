"use client";

import { useState, useRef, useCallback } from "react";
import { Sparkles, Copy, Check, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useBrandStore } from "@/stores/brandStore";
import { useGeneratorStore } from "@/stores/generatorStore";
import { useUserStore } from "@/stores/userStore";
import { executeGeneration } from "@/lib/ai/executionPipeline";
import { ProviderTaskBadge } from "@/components/ai/ProviderTaskBadge";
import { OutputRatingControls } from "@/components/ai/OutputRatingControls";
import {
  GenerationErrorBanner,
  type GenerationErrorState,
} from "@/components/ai/GenerationErrorBanner";
import { buildRatingSnippet } from "@/lib/ai/outputRatings";
import { toast } from "sonner";

const MOOD_OPTIONS = [
  "Calm",
  "Bold",
  "Aspirational",
  "Cozy",
  "Editorial",
  "Soft & feminine",
  "Cinematic",
  "Playful",
];

export default function InspirationGeneratorPage() {
  const { activeBrand } = useBrandStore();
  const { preferences, memory, taskPrompts } = useUserStore();
  const { temperature, setTemperature, currentRun, setCurrentRun, resetRun } =
    useGeneratorStore();

  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [resolvedProviderLabel, setResolvedProviderLabel] = useState<
    string | null
  >(null);
  const [genError, setGenError] = useState<GenerationErrorState | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [lastRunSnippet, setLastRunSnippet] = useState<string>("");
  const [selectedNiche, setSelectedNiche] = useState<string>("auto");
  const [theme, setTheme] = useState<string>("");
  const [mood, setMood] = useState<string>(MOOD_OPTIONS[0]);
  const [copied, setCopied] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!activeBrand) {
      toast.error("No brand profile loaded");
      return;
    }

    resetRun();
    setOutput("");
    setResolvedProviderLabel(null);
    setGenError(null);
    setLastRunId(null);
    setLastRunSnippet("");
    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      const niche =
        selectedNiche === "auto"
          ? activeBrand.niches[0]?.name || "General"
          : selectedNiche;
      const themeLine = theme.trim() || "open mood / direction reference";

      const result = await executeGeneration({
        brand: activeBrand,
        template: {
          id: "inspiration-pin-default",
          name: "Inspiration Pin",
          version: "v2026.1",
          description:
            "Mood / direction reference pin — short, evocative, image-led",
          prompt_text: `Generate one Inspiration Pin for ${activeBrand.identity.name}.
Niche: ${niche}
Mood: ${mood}
Theme: ${themeLine}

Generate these sections:
## Mood Brief
A 2-3 sentence summary of the visual feeling and "why now".

## SEO Title (max 100 chars)
Short, evocative, idea-led — not product-led.

## SEO Description (max 800 chars)
Conversational, includes 2-3 hashtags, leads with the feeling.

## Visual Direction
Bullet list: palette cues, composition cues, props, lighting, mood, references.

## Visual Prompt (Illustrated/Collage)
A single self-contained image prompt for an illustrated/collage render.

## Visual Prompt (Photorealistic)
A single self-contained image prompt for a photorealistic render with camera details.

## Caption (one-liner for Pinterest)
A single sentence under 90 characters, no hashtags.

Brand mood keywords: ${activeBrand.visual_system.keywords.join(", ")}
Palette: ${activeBrand.visual_system.palette.map((p) => p.name).join(", ")}
Forbidden visual: ${activeBrand.visual_system.never.join(", ")}`,
          variable_bindings: {},
          output_schema: [
            { key: "title", label: "SEO Title", required: true },
            { key: "description", label: "SEO Description", required: true },
            { key: "prompt_a", label: "Illustrated Prompt", required: true },
            { key: "prompt_b", label: "Photorealistic Prompt", required: true },
          ],
          compatible_generators: ["custom"],
          qc_rules: [],
          estimated_input_tokens: 500,
          estimated_output_tokens: 1500,
          run_count: 0,
          average_qc_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        runtimeInputs: {
          niche,
          mood,
          theme: themeLine,
        },
        task: "inspiration",
        temperature,
        maxTokens: 2000,
        niche,
        targetDate: new Date().toISOString().slice(0, 10),
        runType: "inspiration",
        holdForReview: false,
        personalization: { preferences, memory },
        customUserPrompt: taskPrompts.inspiration_pin?.prompt_text ?? null,
        campaignIntent: `Inspiration pin for ${niche} — mood "${mood}"${
          theme ? ` · theme "${theme}"` : ""
        }`,
        onStageChange: (stage) => setCurrentRun({ status: stage as never }),
        onToken: (token) => setOutput((prev) => prev + token),
        onProgress: (percent) => setCurrentRun({ progress: percent }),
        onError: (error) => {
          const errAny = error as Error & { code?: string };
          setGenError({
            code: errAny.code || "internal_error",
            message: error.message,
          });
          setStreaming(false);
        },
        signal: abortRef.current.signal,
      });

      if (result.runRecord.provider) {
        setResolvedProviderLabel(
          `${result.runRecord.provider} · ${result.runRecord.model}`
        );
      }
      setLastRunId(result.runRecord.id);
      setLastRunSnippet(buildRatingSnippet(result.parsedFields));
      setCurrentRun({
        status: "complete",
        parsedFields: result.parsedFields,
        qcResults: result.qcResults,
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
        costEstimate: result.usage.cost,
      });
      toast.success("Inspiration pin generated!");
    } catch (err) {
      setGenError({
        code: "internal_error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setStreaming(false);
    }
  }, [
    activeBrand,
    selectedNiche,
    theme,
    mood,
    temperature,
    preferences,
    memory,
    taskPrompts,
    resetRun,
    setCurrentRun,
  ]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-deep-espresso">
            Inspiration Pin Generator
          </h2>
          <p className="text-xs text-charcoal -mt-2">
            Mood / direction references — image-led concepts that aren&apos;t
            tied to a single product. Saved master prompt for{" "}
            <span className="text-deep-espresso font-medium">
              Inspiration Pin
            </span>{" "}
            is loaded automatically when set in Settings → Custom Prompts.
          </p>

          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Brand Profile
              </Label>
              <div className="px-4 py-2.5 bg-warm-ivory border border-warm-taupe/40 rounded-lg text-sm">
                {activeBrand?.identity.name || "No brand loaded"}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Niche</Label>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  "auto",
                  ...(activeBrand?.niches.map((n) => n.name) || []),
                ].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSelectedNiche(n)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      selectedNiche === n
                        ? "bg-deep-espresso text-warm-ivory"
                        : "bg-warm-ivory border border-warm-taupe/40 text-charcoal hover:bg-cream-hover"
                    }`}
                  >
                    {n === "auto" ? "AUTO" : n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Mood</Label>
              <div className="flex gap-1.5 flex-wrap">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      mood === m
                        ? "bg-deep-espresso text-warm-ivory"
                        : "bg-warm-ivory border border-warm-taupe/40 text-charcoal hover:bg-cream-hover"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Theme (optional)
              </Label>
              <Input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., quiet luxury winter mornings"
                className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                AI Provider
              </Label>
              <ProviderTaskBadge
                task="inspiration"
                lastRunLabel={resolvedProviderLabel}
              />
            </div>

            {genError && (
              <GenerationErrorBanner
                error={genError}
                onRetry={() => {
                  setGenError(null);
                  void handleGenerate();
                }}
                onDismiss={() => setGenError(null)}
              />
            )}

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

            <Button
              onClick={handleGenerate}
              disabled={streaming || !activeBrand}
              className="w-full bg-deep-espresso text-warm-ivory px-6 py-3 rounded-lg font-medium hover:bg-deep-espresso/90"
            >
              {streaming ? (
                <>Generating... {currentRun.progress}%</>
              ) : (
                <>
                  <Lightbulb className="mr-2" size={16} />
                  Generate Inspiration
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
                <Sparkles
                  size={32}
                  strokeWidth={1}
                  className="text-warm-taupe mb-3"
                />
                <p className="text-sm">
                  Pick a mood, optionally add a theme, and press Generate.
                </p>
                <p className="text-xs text-warm-taupe mt-1">
                  Your saved master prompt will be merged automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  {output
                    .split(/(?=^## )/m)
                    .filter(Boolean)
                    .map((sectionText, i) => {
                      const lines = sectionText.split("\n");
                      const header = lines[0].replace(/^#+\s*/, "");
                      const body = lines.slice(1).join("\n").trim();
                      return (
                        <div
                          key={i}
                          className="bg-warm-ivory/50 border border-warm-taupe/20 rounded-lg p-4 mb-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-serif text-sm font-semibold text-deep-espresso">
                              {header}
                            </h4>
                            <button
                              onClick={() => handleCopy(body, `section-${i}`)}
                              className="p-1 text-charcoal hover:text-deep-espresso"
                              title="Copy"
                            >
                              {copied === `section-${i}` ? (
                                <Check size={14} />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>
                          <div className="text-sm text-charcoal whitespace-pre-wrap">
                            {body}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {currentRun.status === "complete" && lastRunId && (
                  <div className="bg-warm-ivory/50 border border-warm-taupe/20 rounded-lg p-4">
                    <OutputRatingControls
                      runId={lastRunId}
                      runType="inspiration"
                      niche={
                        selectedNiche === "auto"
                          ? activeBrand?.niches[0]?.name || ""
                          : selectedNiche
                      }
                      snippet={lastRunSnippet}
                    />
                    <p className="text-[11px] text-warm-taupe mt-2">
                      Ratings teach the contextual prompt what&apos;s working —
                      favorites and successful runs are referenced in future
                      generations; weak ones are avoided.
                    </p>
                  </div>
                )}

                {currentRun.costEstimate > 0 && (
                  <div className="text-xs text-charcoal">
                    Tokens: {currentRun.inputTokens} in /{" "}
                    {currentRun.outputTokens} out &middot; Cost: $
                    {currentRun.costEstimate.toFixed(4)}
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
