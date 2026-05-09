"use client";

import { useEffect, useState } from "react";
import { DollarSign, X, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useUserStore } from "@/stores/userStore";
import { getTodayCost, getMonthCost } from "@/lib/analytics/costTracker";
import { PROVIDERS, isProviderId } from "@/lib/ai/providers/types";

interface UsageBucket {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  runs: number;
}

interface ProviderBucket {
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  runs: number;
}

interface UsageSummary {
  today: UsageBucket;
  month: UsageBucket;
  providers: ProviderBucket[];
  current_active: { provider: string; model: string } | null;
}

const ZERO_BUCKET: UsageBucket = {
  input_tokens: 0,
  output_tokens: 0,
  total_tokens: 0,
  cost: 0,
  runs: 0,
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function providerLabel(id: string): string {
  return isProviderId(id) ? PROVIDERS[id].label : id;
}

export function CostMeter() {
  const { costMeterVisible, toggleCostMeter } = useUIStore();
  const { authUser } = useUserStore();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [localTodayCost, setLocalTodayCost] = useState(0);
  const [localMonthCost, setLocalMonthCost] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      if (!authUser) {
        setSummary(null);
        return;
      }
      try {
        const res = await fetch("/api/ai/usage/summary", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as UsageSummary;
        if (!cancelled) setSummary(data);
      } catch {
        // ignore — keep last value
      }
    };

    const loadLocal = async () => {
      try {
        const [today, month] = await Promise.all([
          getTodayCost(),
          getMonthCost(),
        ]);
        if (!cancelled) {
          setLocalTodayCost(today);
          setLocalMonthCost(month);
        }
      } catch {
        // dexie not ready yet
      }
    };

    void loadSummary();
    void loadLocal();
    const interval = setInterval(() => {
      void loadSummary();
      void loadLocal();
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authUser]);

  if (!costMeterVisible) return null;

  const today = summary?.today ?? ZERO_BUCKET;
  const month = summary?.month ?? ZERO_BUCKET;
  const showLocalFallback =
    !summary && (localTodayCost > 0 || localMonthCost > 0);

  return (
    <div className="fixed bottom-4 right-4 bg-white/95 backdrop-blur-sm border border-warm-taupe/30 rounded-lg p-3 shadow-sm z-50 min-w-[240px] max-w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-charcoal uppercase tracking-wider">
          <Activity size={12} strokeWidth={1.5} />
          AI Usage
        </div>
        <button
          onClick={toggleCostMeter}
          className="text-warm-taupe hover:text-charcoal transition-colors"
          title="Hide"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      {summary?.current_active ? (
        <div className="bg-warm-ivory/60 border border-warm-taupe/30 rounded-md px-2 py-1.5 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-warm-taupe">
            Active
          </div>
          <div className="text-xs font-medium text-deep-espresso truncate">
            {providerLabel(summary.current_active.provider)}
          </div>
          <div className="text-[11px] text-charcoal truncate">
            {summary.current_active.model}
          </div>
        </div>
      ) : (
        <div className="bg-warm-ivory/60 border border-warm-taupe/30 rounded-md px-2 py-1.5 mb-2 text-[11px] text-charcoal italic">
          No active provider yet — add one in Settings → API Keys.
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-charcoal">Today</span>
          <span className="font-medium text-deep-espresso flex items-center gap-1.5">
            {summary ? (
              <>
                <span className="text-[11px] text-warm-taupe">
                  {formatTokens(today.total_tokens)} tok
                </span>
                <span>${today.cost.toFixed(4)}</span>
              </>
            ) : showLocalFallback ? (
              <span>${localTodayCost.toFixed(4)}</span>
            ) : (
              <span className="text-warm-taupe">—</span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-charcoal">This Month</span>
          <span className="font-medium text-deep-espresso flex items-center gap-1.5">
            {summary ? (
              <>
                <span className="text-[11px] text-warm-taupe">
                  {formatTokens(month.total_tokens)} tok
                </span>
                <span>${month.cost.toFixed(4)}</span>
              </>
            ) : showLocalFallback ? (
              <span>${localMonthCost.toFixed(4)}</span>
            ) : (
              <span className="text-warm-taupe">—</span>
            )}
          </span>
        </div>
        {summary && month.runs > 0 && (
          <div className="flex items-center justify-between text-[11px] text-warm-taupe">
            <span>Generations this month</span>
            <span>{month.runs}</span>
          </div>
        )}
      </div>

      {summary && summary.providers.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((s) => !s)}
            className="flex items-center justify-between w-full mt-2 pt-2 border-t border-warm-taupe/30 text-[11px] text-charcoal hover:text-deep-espresso transition-colors"
          >
            <span className="uppercase tracking-wider">By provider</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {expanded && (
            <div className="space-y-1 mt-1.5">
              {summary.providers.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="text-charcoal truncate mr-2">
                    {providerLabel(p.provider)}
                    <span className="text-warm-taupe ml-1">
                      ({p.runs} run{p.runs === 1 ? "" : "s"})
                    </span>
                  </span>
                  <span className="text-deep-espresso whitespace-nowrap">
                    {formatTokens(p.total_tokens)} tok ·{" "}
                    {p.cost > 0 ? `$${p.cost.toFixed(4)}` : "free"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-2 pt-1.5 border-t border-warm-taupe/30 text-[10px] text-warm-taupe leading-snug">
        <DollarSign size={9} className="inline mr-0.5" />
        Costs are estimates from public price hints; some providers don&apos;t
        return remaining quota.
      </div>
    </div>
  );
}
