"use client";

import { useEffect, useState } from "react";
import { Download, TrendingUp, DollarSign, Target, Sparkles, BarChart3, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAnalytics, type AnalyticsData } from "@/lib/analytics/statsAggregator";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getAnalytics().then(setData).catch(() => {});
  }, []);

  if (!mounted) return null;

  const d = data || {
    totalPins: 0, pinsThisMonth: 0, pinsToday: 0, byNiche: {}, byStatus: {},
    byModel: {}, avgQCScore: 0, totalCost: 0, costThisMonth: 0,
    pinsOverTime: [], qcScoreOverTime: [],
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-deep-espresso">Artisan Insights</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs"><Download size={12} className="mr-1" />Export CSV</Button>
          <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs"><Download size={12} className="mr-1" />Export PDF</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-xs text-charcoal uppercase tracking-wider mb-1"><Sparkles size={12} />Total Pins</div>
          <div className="text-2xl font-serif text-deep-espresso">{d.totalPins}</div>
          <div className="text-xs text-warm-taupe">{d.pinsToday} today &middot; {d.pinsThisMonth} this month</div>
        </div>
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-xs text-charcoal uppercase tracking-wider mb-1"><Target size={12} />QC Score</div>
          <div className="text-2xl font-serif text-deep-espresso">{d.avgQCScore.toFixed(1)}/10</div>
          <div className="text-xs text-warm-taupe">Average across all runs</div>
        </div>
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-xs text-charcoal uppercase tracking-wider mb-1"><DollarSign size={12} />Total Cost</div>
          <div className="text-2xl font-serif text-deep-espresso">${d.totalCost.toFixed(2)}</div>
          <div className="text-xs text-warm-taupe">${d.costThisMonth.toFixed(2)} this month</div>
        </div>
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-xs text-charcoal uppercase tracking-wider mb-1"><TrendingUp size={12} />Cost/Pin</div>
          <div className="text-2xl font-serif text-deep-espresso">${d.totalPins > 0 ? (d.totalCost / d.totalPins).toFixed(4) : "0.00"}</div>
          <div className="text-xs text-warm-taupe">Average cost per pin</div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Niche Distribution */}
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5">
          <h3 className="text-sm font-medium text-deep-espresso mb-3 flex items-center gap-2"><PieChart size={14} />Niche Distribution</h3>
          <div className="space-y-2">
            {Object.entries(d.byNiche).map(([niche, count]) => {
              const pct = d.totalPins > 0 ? (count / d.totalPins * 100) : 0;
              return (
                <div key={niche}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-charcoal">{niche}</span>
                    <span className="text-warm-taupe">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-warm-taupe/20 rounded-full overflow-hidden">
                    <div className="h-full bg-deep-espresso rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(d.byNiche).length === 0 && <p className="text-xs text-warm-taupe">No data yet</p>}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5">
          <h3 className="text-sm font-medium text-deep-espresso mb-3 flex items-center gap-2"><BarChart3 size={14} />Status Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(d.byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center text-xs">
                <span className="text-charcoal">{status}</span>
                <span className={`px-2 py-0.5 rounded-full ${status === "Posted" ? "bg-soft-sage/20 text-soft-sage" : status === "Approved" ? "bg-muted-gold/20 text-muted-gold" : "bg-warm-taupe/20 text-charcoal"}`}>{count}</span>
              </div>
            ))}
            {Object.keys(d.byStatus).length === 0 && <p className="text-xs text-warm-taupe">No data yet</p>}
          </div>
        </div>

        {/* Model Usage */}
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5">
          <h3 className="text-sm font-medium text-deep-espresso mb-3">Model Usage</h3>
          <div className="space-y-2">
            {Object.entries(d.byModel).map(([model, count]) => (
              <div key={model} className="flex justify-between text-xs">
                <span className="text-charcoal truncate max-w-[200px]">{model}</span>
                <span className="text-warm-taupe">{count} runs</span>
              </div>
            ))}
            {Object.keys(d.byModel).length === 0 && <p className="text-xs text-warm-taupe">No data yet</p>}
          </div>
        </div>

        {/* Daily Output */}
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5">
          <h3 className="text-sm font-medium text-deep-espresso mb-3">Daily Output</h3>
          <div className="space-y-1">
            {d.pinsOverTime.slice(-14).map((day) => (
              <div key={day.date} className="flex items-center gap-2">
                <span className="text-[10px] text-warm-taupe w-16">{day.date.slice(5)}</span>
                <div className="flex-1 h-2 bg-warm-taupe/20 rounded-full overflow-hidden">
                  <div className="h-full bg-dusty-rose rounded-full" style={{ width: `${Math.min(100, day.count * 33)}%` }} />
                </div>
                <span className="text-[10px] text-charcoal w-4 text-right">{day.count}</span>
              </div>
            ))}
            {d.pinsOverTime.length === 0 && <p className="text-xs text-warm-taupe">No data yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
