"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, X, RefreshCw } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { getTodayCost, getMonthCost, getCostByProvider } from "@/lib/analytics/costTracker";

export function CostMeter() {
  const { costMeterVisible, toggleCostMeter } = useUIStore();
  const [todayCost, setTodayCost] = useState(0);
  const [monthCost, setMonthCost] = useState(0);
  const [byProvider, setByProvider] = useState<Record<string, number>>({});

  const loadCosts = useCallback(async () => {
    try {
      const [today, month, providers] = await Promise.all([
        getTodayCost(),
        getMonthCost(),
        getCostByProvider(),
      ]);
      setTodayCost(today);
      setMonthCost(month);
      setByProvider(providers);
    } catch {
      // DB not ready yet
    }
  }, []);

  useEffect(() => {
    loadCosts();
    const interval = setInterval(loadCosts, 5000);

    const handleCostUpdate = () => loadCosts();
    window.addEventListener("pinhub:cost-update", handleCostUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pinhub:cost-update", handleCostUpdate);
    };
  }, [loadCosts]);

  if (!costMeterVisible) return null;

  const providerEntries = Object.entries(byProvider).filter(([, cost]) => cost > 0);

  return (
    <div className="fixed bottom-4 right-4 bg-white/90 dark:bg-deep-espresso/90 backdrop-blur-sm border border-warm-taupe/30 rounded-lg p-3 shadow-sm z-50 min-w-[220px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-charcoal uppercase tracking-wider">
          <DollarSign size={12} strokeWidth={1.5} />
          Cost Meter
        </div>
        <div className="flex items-center gap-1">
          <button onClick={loadCosts} className="text-warm-taupe hover:text-charcoal transition-colors" title="Refresh">
            <RefreshCw size={12} strokeWidth={1.5} />
          </button>
          <button onClick={toggleCostMeter} className="text-warm-taupe hover:text-charcoal transition-colors">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-charcoal">Today</span>
          <span className="font-medium text-deep-espresso">${todayCost.toFixed(4)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-charcoal">This Month</span>
          <span className="font-medium text-deep-espresso">${monthCost.toFixed(4)}</span>
        </div>
        {providerEntries.length > 0 && (
          <>
            <div className="border-t border-warm-taupe/20 mt-1.5 pt-1.5">
              <div className="text-[10px] text-warm-taupe uppercase tracking-wider mb-1">By Provider</div>
              {providerEntries.map(([provider, cost]) => (
                <div key={provider} className="flex justify-between text-xs">
                  <span className="text-charcoal capitalize">{provider}</span>
                  <span className="text-charcoal">${cost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
