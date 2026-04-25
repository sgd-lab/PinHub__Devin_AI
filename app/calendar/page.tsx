"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
import { useBrandStore } from "@/stores/brandStore";
import { getPinsForDateRange, updateRunTargetDate } from "@/lib/db/runRepository";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import type { RunRecord } from "@/lib/db/dexie";
import { toast } from "sonner";

const NICHE_COLORS: Record<string, string> = {
  "Quiet Luxury Workwear": "#3E2723",
  "Weekend Capsule": "#B5C4B1",
  "Evening Edit": "#C9B458",
};

export default function CalendarPage() {
  const { activeBrand } = useBrandStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pins, setPins] = useState<RunRecord[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [planningMode, setPlanningMode] = useState(false);
  const [draggedPin, setDraggedPin] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  useEffect(() => {
    const load = async () => {
      try {
        const start = format(monthStart, "yyyy-MM-dd");
        const end = format(monthEnd, "yyyy-MM-dd");
        const data = await getPinsForDateRange(start, end);
        setPins(data);
      } catch {}
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const pinsByDate = useMemo(() => {
    const map: Record<string, RunRecord[]> = {};
    for (const pin of pins) {
      const date = pin.target_date;
      if (!map[date]) map[date] = [];
      map[date].push(pin);
    }
    return map;
  }, [pins]);

  const getNicheForDay = (date: Date) => {
    if (!activeBrand) return null;
    const dayName = format(date, "EEE") as "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
    return activeBrand.niches.find((n) => n.rotation_days.includes(dayName));
  };

  const handleDrop = async (dateStr: string) => {
    if (!draggedPin) return;
    try {
      await updateRunTargetDate(draggedPin, dateStr);
      setPins((prev) => prev.map((p) => p.id === draggedPin ? { ...p, target_date: dateStr } : p));
      toast.success("Pin moved");
    } catch {
      toast.error("Failed to move pin");
    }
    setDraggedPin(null);
  };

  const totalPins = pins.length;
  const topNiche = pins.length > 0 ? Object.entries(pins.reduce((acc, p) => { acc[p.niche] = (acc[p.niche] || 0) + 1; return acc; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] || "" : "";

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Top controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-cream-hover rounded-lg"><ChevronLeft size={16} /></button>
          <h2 className="font-serif text-xl text-deep-espresso">{format(currentMonth, "MMMM yyyy")}</h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-cream-hover rounded-lg"><ChevronRight size={16} /></button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-warm-ivory border border-warm-taupe/30 rounded-lg p-0.5">
            {(["month", "week", "day"] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1 text-xs rounded capitalize ${viewMode === m ? "bg-deep-espresso text-warm-ivory" : "text-charcoal"}`}>{m}</button>
            ))}
          </div>
          <Button size="sm" variant={planningMode ? "default" : "outline"} onClick={() => setPlanningMode(!planningMode)} className={`text-xs rounded-lg ${planningMode ? "bg-deep-espresso text-warm-ivory" : "border-warm-taupe"}`}>
            Planning Mode
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white/60 border border-warm-taupe/30 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 text-center text-xs font-medium text-charcoal uppercase tracking-wider">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2 border-b border-warm-taupe/20">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startDay }, (_, i) => (
            <div key={`empty-${i}`} className="min-h-[120px] border-b border-r border-warm-taupe/10 bg-warm-ivory/30" />
          ))}
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayPins = pinsByDate[dateStr] || [];
            const niche = getNicheForDay(day);
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

            return (
              <div
                key={dateStr}
                className={`min-h-[120px] border-b border-r border-warm-taupe/10 p-1.5 ${isToday ? "bg-dusty-rose/5" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(dateStr)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${isToday ? "text-dusty-rose" : "text-charcoal"}`}>{format(day, "d")}</span>
                  {niche && (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NICHE_COLORS[niche.name] || "#C9A99A" }} title={niche.name} />
                  )}
                </div>
                {dayPins.map((pin) => (
                  <div
                    key={pin.id}
                    draggable
                    onDragStart={() => setDraggedPin(pin.id)}
                    className="text-[10px] bg-warm-ivory border border-warm-taupe/20 rounded px-1.5 py-1 mb-0.5 cursor-grab truncate"
                    title={pin.parsed_fields.title as string}
                  >
                    {pin.parsed_fields.title as string || "Untitled"}
                  </div>
                ))}
                {planningMode && dayPins.length === 0 && niche && (
                  <button className="w-full text-[10px] border border-dashed border-warm-taupe/30 rounded py-2 text-warm-taupe hover:bg-cream-hover">
                    <Plus size={10} className="inline mr-0.5" />Generate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-warm-ivory border border-warm-taupe/30 rounded-lg p-4">
          <div className="text-xs text-charcoal uppercase tracking-wider mb-1">Month Velocity</div>
          <div className="font-medium text-deep-espresso">{totalPins}/60 Pins</div>
        </div>
        <div className="bg-warm-ivory border border-warm-taupe/30 rounded-lg p-4">
          <div className="text-xs text-charcoal uppercase tracking-wider mb-1">Top Niche</div>
          <div className="font-medium text-deep-espresso">{topNiche || "—"}</div>
        </div>
        <div className="bg-deep-espresso text-warm-ivory rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider opacity-80 mb-1">Weekly Strategy</div>
          <div className="font-serif text-sm">Curate with intention. Every pin tells a story.</div>
        </div>
      </div>
    </div>
  );
}
