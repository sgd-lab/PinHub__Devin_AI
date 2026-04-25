"use client";

import { useEffect, useState } from "react";
import { DollarSign, X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { getTodayCost, getMonthCost } from "@/lib/analytics/costTracker";

export function CostMeter() {
  const { costMeterVisible, toggleCostMeter } = useUIStore();
  const [todayCost, setTodayCost] = useState(0);
  const [monthCost, setMonthCost] = useState(0);

  useEffect(() => {
    const loadCosts = async () => {
      try {
        const [today, month] = await Promise.all([
          getTodayCost(),
          getMonthCost(),
        ]);
        setTodayCost(today);
        setMonthCost(month);
      } catch {
        // DB not ready yet
      }
    };

    loadCosts();
    const interval = setInterval(loadCosts, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!costMeterVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-warm-taupe/30 rounded-lg p-3 shadow-sm z-50 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-charcoal uppercase tracking-wider">
          <DollarSign size={12} strokeWidth={1.5} />
          Cost Meter
        </div>
        <button
          onClick={toggleCostMeter}
          className="text-warm-taupe hover:text-charcoal transition-colors"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-charcoal">Today</span>
          <span className="font-medium text-deep-espresso">
            ${todayCost.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-charcoal">This Month</span>
          <span className="font-medium text-deep-espresso">
            ${monthCost.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}
