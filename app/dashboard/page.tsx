"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, FileText, Image as ImageIcon, Key, Link2 } from "lucide-react";
import { useBrandStore } from "@/stores/brandStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getRecentRuns } from "@/lib/db/runRepository";
import { getTodayCost } from "@/lib/analytics/costTracker";
import type { RunRecord } from "@/lib/db/dexie";
import { hasApiKey } from "@/lib/encryption/keyStore";
import { format } from "date-fns";

export default function DashboardPage() {
  const { activeBrand } = useBrandStore();
  const { notion } = useSettingsStore();
  const [recentRuns, setRecentRuns] = useState<RunRecord[]>([]);
  const [todayCost, setTodayCost] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const load = async () => {
      try {
        const runs = await getRecentRuns(5);
        setRecentRuns(runs);
        const cost = await getTodayCost();
        setTodayCost(cost);
      } catch {
        // DB not ready
      }
    };
    load();
  }, []);

  if (!mounted) return null;

  const today = new Date();
  const dayOfWeek = format(today, "EEEE");
  const dateStr = format(today, "MMMM d, yyyy");
  const operatorName = activeBrand?.identity.operator_name || "there";

  // Determine today's niche based on rotation
  const todayDay = format(today, "EEE") as "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  const todayNiche = activeBrand?.niches.find((n) => n.rotation_days.includes(todayDay));

  const hasNvidia = hasApiKey("nvidia");
  const hasOpenRouter = hasApiKey("openrouter");
  const hasNotion = notion.enabled;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Morning Briefing */}
      <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-6">
        <div className="text-xs font-medium text-charcoal uppercase tracking-wider mb-1">
          Today &middot; {dayOfWeek} &middot; {dateStr}
        </div>
        <h1 className="font-serif text-3xl text-deep-espresso italic mb-2">
          Good morning, {operatorName}.
        </h1>
        <p className="text-charcoal leading-relaxed">
          {todayNiche ? (
            <>Today&apos;s niche is <span className="font-medium text-deep-espresso">{todayNiche.name}</span>. </>
          ) : null}
          {recentRuns.length > 0 ? (
            <>You&apos;ve generated {recentRuns.length} pin{recentRuns.length > 1 ? "s" : ""} recently. </>
          ) : (
            <>Click &quot;Generate Today&apos;s 3 Pins&quot; to begin. </>
          )}
          {todayCost > 0 && <>Today&apos;s API cost: ${todayCost.toFixed(4)}. </>}
        </p>
      </div>

      {/* Quick Launch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/generate/daily" className="bg-deep-espresso text-warm-ivory rounded-lg p-5 hover:bg-deep-espresso/90 transition-colors group">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={20} strokeWidth={1.5} />
            <span className="text-xs uppercase tracking-wider opacity-80">Quick Action</span>
          </div>
          <h3 className="font-serif text-lg mb-1">Generate Today&apos;s 3 Pins</h3>
          <p className="text-sm opacity-80">
            {todayNiche ? `3 pins for ${todayNiche.name}` : "Select a niche to begin"} &middot; {activeBrand?.identity.primary_market || "US, CA, UK"}
          </p>
          <span className="inline-block mt-3 text-sm font-medium bg-warm-ivory/20 px-3 py-1.5 rounded-lg group-hover:bg-warm-ivory/30 transition-colors">
            Generate
          </span>
        </Link>

        <Link href="/generate/guide" className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 hover:bg-cream-hover transition-colors group">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={20} strokeWidth={1.5} className="text-deep-espresso" />
            <span className="text-xs uppercase tracking-wider text-charcoal">Weekly</span>
          </div>
          <h3 className="font-serif text-lg text-deep-espresso mb-1">Generate This Week&apos;s Guide</h3>
          <p className="text-sm text-charcoal">Builds from this week&apos;s 3-pin runs</p>
          <span className="inline-block mt-3 text-sm font-medium border border-warm-taupe text-deep-espresso px-3 py-1.5 rounded-lg">
            Start Guide
          </span>
        </Link>

        <Link href="/generate/single" className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 hover:bg-cream-hover transition-colors group">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon size={20} strokeWidth={1.5} className="text-deep-espresso" />
            <span className="text-xs uppercase tracking-wider text-charcoal">Single</span>
          </div>
          <h3 className="font-serif text-lg text-deep-espresso mb-1">Generate Single Collage Pin</h3>
          <p className="text-sm text-charcoal">One outfit &middot; dual image prompts</p>
          <span className="inline-block mt-3 text-sm font-medium border border-warm-taupe text-deep-espresso px-3 py-1.5 rounded-lg">
            Create Pin
          </span>
        </Link>
      </div>

      {/* Status Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-warm-ivory border border-warm-taupe/30 rounded-lg p-4">
          <div className="text-[10px] font-medium text-charcoal uppercase tracking-wider mb-1">Today&apos;s Niche</div>
          <div className="text-sm font-medium text-deep-espresso">{todayNiche?.name || "None assigned"}</div>
        </div>
        <div className="bg-warm-ivory border border-warm-taupe/30 rounded-lg p-4">
          <div className="text-[10px] font-medium text-charcoal uppercase tracking-wider mb-1">Calendar Day</div>
          <div className="text-sm font-medium text-deep-espresso">{format(today, "d")} / {new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()}</div>
        </div>
        <div className="bg-warm-ivory border border-warm-taupe/30 rounded-lg p-4">
          <div className="text-[10px] font-medium text-charcoal uppercase tracking-wider mb-1">Last Run</div>
          <div className="text-sm font-medium text-deep-espresso">
            {recentRuns[0] ? format(new Date(recentRuns[0].created_at), "h:mm a") : "No runs yet"}
          </div>
        </div>
        <div className="bg-warm-ivory border border-warm-taupe/30 rounded-lg p-4">
          <div className="text-[10px] font-medium text-charcoal uppercase tracking-wider mb-1">API Usage</div>
          <div className="text-sm font-medium text-deep-espresso">${todayCost.toFixed(4)}</div>
        </div>
      </div>

      {/* Keys Status + Notion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-warm-ivory border border-warm-taupe/30 rounded-lg p-4 flex items-center gap-3">
          <Key size={16} strokeWidth={1.5} className="text-charcoal" />
          <div className="flex-1">
            <div className="text-xs text-charcoal">API Keys Status</div>
            <div className="flex gap-2 mt-1">
              <span className={`text-xs flex items-center gap-1 ${hasNvidia ? "text-soft-sage" : "text-warm-taupe"}`}>
                <span className={`w-2 h-2 rounded-full ${hasNvidia ? "bg-soft-sage" : "bg-warm-taupe"}`} />
                NVIDIA
              </span>
              <span className={`text-xs flex items-center gap-1 ${hasOpenRouter ? "text-soft-sage" : "text-warm-taupe"}`}>
                <span className={`w-2 h-2 rounded-full ${hasOpenRouter ? "bg-soft-sage" : "bg-warm-taupe"}`} />
                OpenRouter
              </span>
            </div>
          </div>
        </div>
        <div className="bg-warm-ivory border border-warm-taupe/30 rounded-lg p-4 flex items-center gap-3">
          <Link2 size={16} strokeWidth={1.5} className="text-charcoal" />
          <div>
            <div className="text-xs text-charcoal">Notion Sync</div>
            <span className={`text-xs flex items-center gap-1 mt-1 ${hasNotion ? "text-soft-sage" : "text-warm-taupe"}`}>
              <span className={`w-2 h-2 rounded-full ${hasNotion ? "bg-soft-sage" : "bg-warm-taupe"}`} />
              {hasNotion ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentRuns.length > 0 && (
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-warm-taupe/20">
            <h3 className="text-sm font-medium text-deep-espresso">Recent Activity</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-charcoal uppercase tracking-wider">
                <th className="px-5 py-2 text-left font-medium">Time</th>
                <th className="px-5 py-2 text-left font-medium">Type</th>
                <th className="px-5 py-2 text-left font-medium">Niche</th>
                <th className="px-5 py-2 text-left font-medium">Model</th>
                <th className="px-5 py-2 text-left font-medium">Status</th>
                <th className="px-5 py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr key={run.id} className="border-t border-warm-taupe/10 hover:bg-cream-hover/50 cursor-pointer">
                  <td className="px-5 py-2.5 text-charcoal">{format(new Date(run.created_at), "h:mm a")}</td>
                  <td className="px-5 py-2.5 capitalize">{run.run_type}</td>
                  <td className="px-5 py-2.5">{run.niche}</td>
                  <td className="px-5 py-2.5 text-xs text-charcoal truncate max-w-[120px]">{run.model}</td>
                  <td className="px-5 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      run.status === "Posted" ? "bg-soft-sage/20 text-soft-sage" :
                      run.status === "Approved" ? "bg-muted-gold/20 text-muted-gold" :
                      "bg-warm-taupe/20 text-charcoal"
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right text-charcoal">${run.cost_estimate.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
