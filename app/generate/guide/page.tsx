"use client";

import { useState, useRef, useCallback } from "react";
import { FileText, Sparkles, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useBrandStore } from "@/stores/brandStore";
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

const MONETIZATION_ANGLES = ["Affiliate", "Brand Deal", "Community"] as const;
type Angle = (typeof MONETIZATION_ANGLES)[number];

export default function GuideGeneratorPage() {
  const { activeBrand } = useBrandStore();
  const { preferences, memory, taskPrompts } = useUserStore();
  const [guideTitle, setGuideTitle] = useState("");
  const [weekLabel, setWeekLabel] = useState("");
  const [angle, setAngle] = useState<Angle>("Affiliate");
  const [temperature, setTemperature] = useState(0.7);
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resolvedProviderLabel, setResolvedProviderLabel] = useState<string | null>(null);
  const [genError, setGenError] = useState<GenerationErrorState | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [lastRunSnippet, setLastRunSnippet] = useState<string>("");
  const [lastRunNiche, setLastRunNiche] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!activeBrand) {
      toast.error("No brand profile loaded");
      return;
    }

    setOutput("");
    setProgress(0);
    setResolvedProviderLabel(null);
    setGenError(null);
    setLastRunId(null);
    setLastRunSnippet("");
    setLastRunNiche("");
    setStreaming(true);
    abortRef.current = new AbortController();

    const title = guideTitle || `${weekLabel || "This Week"} — Style Guide`;

    try {
      const result = await executeGeneration({
        brand: activeBrand,
        template: {
          id: "guide-default",
          name: "PinHub — Weekly Style Guide",
          version: "v2026.1",
          description: "Long-form weekly style guide",
          prompt_text: `Write a long-form weekly Pinterest content guide titled "${title}" for the brand ${activeBrand.identity.name}.
Week label: ${weekLabel || "current week"}
Monetization angle: ${angle}
Niches: ${activeBrand.niches.map((n) => n.name).join(", ")}
Voice power words: ${activeBrand.voice.power_words.join(", ")}
Palette: ${activeBrand.visual_system.palette.map((p) => p.name).join(", ")}

Structure the guide with these markdown sections:
## Hook
A 2-3 sentence hook that frames the week.

## This Week's Story
A 4-6 sentence narrative about what the brand is exploring this week.

## 5 Pin Concepts
Numbered list. For each concept include: a hook line, a 2-sentence description, and 3 hashtags.

## Hook Lines
A bulleted list of 7 short hook lines tied to ${angle.toLowerCase()} angles.

## Call to Action
1-2 sentences with a clear CTA matching the ${angle.toLowerCase()} angle.

Keep the tone consistent with the brand's voice. Avoid generic content; reference the brand's niches explicitly.`,
          variable_bindings: {},
          output_schema: [
            { key: "hook", label: "Hook", required: true },
            { key: "story", label: "This Week's Story", required: true },
            { key: "pin_concepts", label: "5 Pin Concepts", required: true },
            { key: "hook_lines", label: "Hook Lines", required: true },
            { key: "cta", label: "Call to Action", required: true },
          ],
          compatible_generators: ["guide"],
          qc_rules: [],
          estimated_input_tokens: 700,
          estimated_output_tokens: 3500,
          run_count: 0,
          average_qc_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        runtimeInputs: {
          guide_title: title,
          week_label: weekLabel,
          monetization_angle: angle,
          country_set: "US, CA, UK",
        },
        task: "guide",
        temperature,
        maxTokens: 4000,
        niche: activeBrand.niches[0]?.name || "",
        targetDate: new Date().toISOString().slice(0, 10),
        runType: "guide",
        holdForReview: false,
        personalization: { preferences, memory },
        customUserPrompt: taskPrompts.guide?.prompt_text ?? null,
        campaignIntent: `Weekly long-form guide "${title}" with ${angle} monetization angle`,
        onStageChange: () => {},
        onToken: (token) => setOutput((prev) => prev + token),
        onProgress: (percent) => setProgress(percent),
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
      setLastRunNiche(activeBrand.niches[0]?.name || "");
      toast.success("Guide generated!");
    } catch (err) {
      setGenError({
        code: "internal_error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setStreaming(false);
    }
  }, [activeBrand, guideTitle, weekLabel, angle, temperature, preferences, memory, taskPrompts]);

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(output);
    toast.success("Markdown copied");
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
              <Input
                value={guideTitle}
                onChange={(e) => setGuideTitle(e.target.value)}
                placeholder="e.g., Week 12 Style Guide"
                className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Week / Month Label</Label>
              <Input
                value={weekLabel}
                onChange={(e) => setWeekLabel(e.target.value)}
                placeholder="e.g., March Week 3"
                className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Monetization Angle</Label>
              <div className="flex gap-1.5">
                {MONETIZATION_ANGLES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAngle(a)}
                    className={`px-3 py-1.5 text-xs rounded-lg ${
                      angle === a
                        ? "bg-deep-espresso text-warm-ivory"
                        : "bg-warm-ivory border border-warm-taupe/40 hover:bg-cream-hover"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">AI Provider</Label>
              <ProviderTaskBadge task="guide" lastRunLabel={resolvedProviderLabel} />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Temperature: {temperature.toFixed(2)}
              </Label>
              <Slider
                value={[temperature]}
                onValueChange={([v]) => setTemperature(v)}
                min={0}
                max={1.5}
                step={0.05}
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

            <Button
              onClick={streaming ? handleStop : handleGenerate}
              disabled={!activeBrand && !streaming}
              className="w-full bg-deep-espresso text-warm-ivory px-6 py-3 rounded-lg font-medium"
            >
              {streaming ? (
                <>Stop Generating ({progress}%)</>
              ) : (
                <>
                  <Sparkles className="mr-2" size={16} />
                  Generate Guide
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-deep-espresso">Guide Preview</h2>
          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 min-h-[400px]">
            {!output && !streaming ? (
              <div className="flex flex-col items-center justify-center h-[350px] text-center text-charcoal">
                <FileText size={32} strokeWidth={1} className="text-warm-taupe mb-3" />
                <p className="text-sm">Configure inputs and generate your weekly guide.</p>
                <p className="text-xs text-warm-taupe mt-1">The guide streams here.</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-charcoal">
                {output}
              </div>
            )}
          </div>
          {output && lastRunId && !streaming && (
            <div className="bg-warm-ivory/50 border border-warm-taupe/20 rounded-lg p-4">
              <OutputRatingControls
                runId={lastRunId}
                runType="guide"
                niche={lastRunNiche}
                snippet={lastRunSnippet}
              />
              <p className="text-[11px] text-warm-taupe mt-2">
                Ratings teach the contextual prompt what&apos;s working — favorites and successful runs are referenced in future generations; weak ones are avoided.
              </p>
            </div>
          )}
          {output && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-warm-taupe rounded-lg"
                onClick={handleCopyMarkdown}
              >
                <Copy size={14} className="mr-1" /> Copy Markdown
              </Button>
              <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg" disabled>
                <Download size={14} className="mr-1" /> Export PDF
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
