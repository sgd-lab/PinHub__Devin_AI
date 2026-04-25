"use client";

import { useState, useRef } from "react";
import { Zap, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBrandStore } from "@/stores/brandStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useGeneratorStore } from "@/stores/generatorStore";
import { executeGeneration } from "@/lib/ai/executionPipeline";
import { retrieveApiKey } from "@/lib/encryption/keyStore";
import { toast } from "sonner";
import { format, addDays, startOfWeek } from "date-fns";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function MegaRunPage() {
  const { activeBrand } = useBrandStore();
  const { providers, defaultProvider } = useSettingsStore();
  const { temperature, maxTokens, holdForReview, resetRun } = useGeneratorStore();
  const [phase, setPhase] = useState<"confirm" | "running" | "complete">("confirm");
  const [progress, setProgress] = useState(0);
  const [completedDays, setCompletedDays] = useState(0);
  const [dayStatus, setDayStatus] = useState<Record<number, "pending" | "running" | "done" | "error">>({});
  const [totalCost, setTotalCost] = useState(0);
  const [successDays, setSuccessDays] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const handleStart = async () => {
    if (!activeBrand) { toast.error("No brand loaded"); return; }
    const apiKey = retrieveApiKey(defaultProvider, "pinhub-default-key");
    if (!apiKey) { toast.error("No API key configured. Go to Settings → API Keys."); return; }
    const provider = providers[defaultProvider];

    setPhase("running");
    setCompletedDays(0);
    setProgress(0);
    setTotalCost(0);
    setSuccessDays(0);
    setDayStatus({});
    abortRef.current = new AbortController();

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    for (let day = 0; day < 7; day++) {
      if (abortRef.current.signal.aborted) break;

      setDayStatus((prev) => ({ ...prev, [day]: "running" }));
      const targetDate = format(addDays(weekStart, day), "yyyy-MM-dd");
      const dayName = DAYS[day];
      const niche = activeBrand.niches[day % activeBrand.niches.length]?.name || "General";

      try {
        const result = await executeGeneration({
          brand: activeBrand,
          template: {
            id: `mega-day-${day}`,
            name: `Mega Run — ${dayName}`,
            version: "v2026.4",
            description: `3 pins for ${dayName}`,
            prompt_text: `Generate 3 coordinated Pinterest pins for ${activeBrand.identity.name}.
Day: ${dayName} | Niche: ${niche} | Date: ${targetDate}

For each of the 3 pins, generate:
## Pin 1 — HERO
### Title (max 100 chars)
### Description (max 800 chars with hashtags)
### Visual Prompt
## Pin 2 — DETAIL
### Title (max 100 chars)
### Description (max 800 chars with hashtags)
### Visual Prompt
## Pin 3 — LIFESTYLE
### Title (max 100 chars)
### Description (max 800 chars with hashtags)
### Visual Prompt

Brand: ${activeBrand.identity.tagline}
Voice: ${activeBrand.voice.power_words.join(", ")}`,
            variable_bindings: {},
            output_schema: [
              { key: "title", label: "Title", required: true },
              { key: "description", label: "Description", required: true },
            ],
            compatible_generators: ["mega"],
            qc_rules: [],
            estimated_input_tokens: 500,
            estimated_output_tokens: 3000,
            run_count: 0,
            average_qc_score: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          runtimeInputs: { niche, country_set: "US, CA, UK" },
          provider: { name: defaultProvider, base_url: provider.base_url, api_key: apiKey, model: provider.default_model },
          temperature,
          maxTokens: Math.max(maxTokens, 3000),
          niche,
          targetDate,
          runType: "mega",
          holdForReview,
          onStageChange: () => {},
          onToken: () => {},
          onProgress: () => {},
          onError: (error) => toast.error(`Day ${day + 1}: ${error.message}`),
          signal: abortRef.current.signal,
        });

        setTotalCost((prev) => prev + result.usage.cost);
        setDayStatus((prev) => ({ ...prev, [day]: "done" }));
        setSuccessDays((prev) => prev + 1);
      } catch {
        setDayStatus((prev) => ({ ...prev, [day]: "error" }));
      }

      setCompletedDays(day + 1);
      setProgress(Math.round(((day + 1) / 7) * 100));
    }

    setPhase("complete");
    toast.success(`Mega Run complete! ${successDays * 3} pins generated.`);
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setPhase("confirm");
    resetRun();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="font-serif text-2xl text-deep-espresso">Mega Run — Full Week</h2>

      {phase === "confirm" && (
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-muted-gold/10 rounded-full flex items-center justify-center mx-auto">
            <Zap size={28} className="text-muted-gold" />
          </div>
          <h3 className="font-serif text-xl text-deep-espresso">Run Full Week</h3>
          <p className="text-charcoal">Generate all 21 pins (3 per day, 7 days) plus a weekly guide.</p>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-warm-ivory rounded-lg p-3">
              <div className="text-xs text-charcoal uppercase tracking-wider">API Calls</div>
              <div className="font-medium text-deep-espresso text-lg">~7</div>
            </div>
            <div className="bg-warm-ivory rounded-lg p-3">
              <div className="text-xs text-charcoal uppercase tracking-wider">Est. Time</div>
              <div className="font-medium text-deep-espresso text-lg">~10 min</div>
            </div>
            <div className="bg-warm-ivory rounded-lg p-3">
              <div className="text-xs text-charcoal uppercase tracking-wider">Est. Cost</div>
              <div className="font-medium text-deep-espresso text-lg">~$0.40</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-gold justify-center">
            <AlertTriangle size={12} />
            This will use your API credits. Monitor your cost meter.
          </div>

          <Button onClick={handleStart} disabled={!activeBrand} className="bg-deep-espresso text-warm-ivory px-8 py-3 rounded-lg font-medium">
            <Zap className="mr-2" size={16} />Confirm & Start Mega Run
          </Button>
        </div>
      )}

      {phase === "running" && (
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-deep-espresso">Running Mega Week...</h3>
            <Button variant="outline" size="sm" onClick={handleCancel} className="border-warm-taupe rounded-lg text-xs">Cancel</Button>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-charcoal">Day {completedDays}/7 &middot; {completedDays * 3}/21 pins &middot; ${totalCost.toFixed(4)} spent</p>

          <div className="space-y-2">
            {DAYS.map((name, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                dayStatus[i] === "done" ? "bg-soft-sage/10 border-soft-sage/30" :
                dayStatus[i] === "running" ? "bg-muted-gold/10 border-muted-gold/30" :
                dayStatus[i] === "error" ? "bg-red-50 border-red-200" :
                "bg-warm-ivory border-warm-taupe/20"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {dayStatus[i] === "done" && <CheckCircle2 size={14} className="text-soft-sage" />}
                    {dayStatus[i] === "running" && <Zap size={14} className="text-muted-gold animate-pulse" />}
                    {dayStatus[i] === "error" && <XCircle size={14} className="text-red-500" />}
                    {name}
                  </span>
                  <span className="text-xs text-charcoal">
                    {dayStatus[i] === "done" ? "3/3 pins" : dayStatus[i] === "running" ? "Generating..." : dayStatus[i] === "error" ? "Failed" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "complete" && (
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-8 text-center space-y-4">
          <CheckCircle2 size={32} className="text-soft-sage mx-auto" />
          <h3 className="font-serif text-xl text-deep-espresso">Mega Run Complete!</h3>
          <p className="text-charcoal">{successDays * 3} pins generated and added to your library.</p>
          <p className="text-xs text-warm-taupe">Total cost: ${totalCost.toFixed(4)}</p>
          <Button onClick={() => setPhase("confirm")} variant="outline" className="border-warm-taupe rounded-lg">Run Another Week</Button>
        </div>
      )}
    </div>
  );
}
