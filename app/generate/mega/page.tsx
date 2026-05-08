"use client";

import { useState } from "react";
import { Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBrandStore } from "@/stores/brandStore";
import { ProviderTaskBadge } from "@/components/ai/ProviderTaskBadge";

export default function MegaRunPage() {
  const { activeBrand } = useBrandStore();
  const [phase, setPhase] = useState<"confirm" | "running" | "complete">("confirm");
  const [progress] = useState(0);
  const [completedDays] = useState(0);

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

          <div className="text-left">
            <ProviderTaskBadge task="pin" compact />
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-warm-ivory rounded-lg p-3">
              <div className="text-xs text-charcoal uppercase tracking-wider">API Calls</div>
              <div className="font-medium text-deep-espresso text-lg">~21</div>
            </div>
            <div className="bg-warm-ivory rounded-lg p-3">
              <div className="text-xs text-charcoal uppercase tracking-wider">Est. Time</div>
              <div className="font-medium text-deep-espresso text-lg">~15 min</div>
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

          <Button onClick={() => setPhase("running")} disabled={!activeBrand} className="bg-deep-espresso text-warm-ivory px-8 py-3 rounded-lg font-medium">
            <Zap className="mr-2" size={16} />Confirm & Start Mega Run
          </Button>
        </div>
      )}

      {phase === "running" && (
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-deep-espresso">Running Mega Week...</h3>
            <Button variant="outline" size="sm" onClick={() => setPhase("confirm")} className="border-warm-taupe rounded-lg text-xs">Cancel</Button>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-charcoal">Day {completedDays}/7 &middot; {completedDays * 3}/21 pins generated</p>

          <div className="space-y-2">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className={`p-3 rounded-lg border ${i < completedDays ? "bg-soft-sage/10 border-soft-sage/30" : "bg-warm-ivory border-warm-taupe/20"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]}</span>
                  <span className="text-xs text-charcoal">{i < completedDays ? "3/3 pins" : "Pending"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "complete" && (
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-8 text-center space-y-4">
          <h3 className="font-serif text-xl text-deep-espresso">Mega Run Complete!</h3>
          <p className="text-charcoal">21 pins + 1 guide generated and added to your calendar.</p>
        </div>
      )}
    </div>
  );
}
