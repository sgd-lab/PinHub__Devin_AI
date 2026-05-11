"use client";

import { useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ParsedPin } from "@/lib/parsing/pinSections";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pins: ParsedPin[];
  runId: string | null;
  runType: string | null;
}

type Cadence = "single_day" | "daily" | "every_other_day" | "weekly";

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AddToCalendarModal({
  open,
  onOpenChange,
  pins,
  runId,
  runType,
}: Props) {
  const today = new Date();
  const [startDate, setStartDate] = useState<string>(isoDate(today));
  const [time, setTime] = useState<string>("09:00");
  const [cadence, setCadence] = useState<Cadence>(
    pins.length > 1 ? "daily" : "single_day"
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSchedule = async () => {
    if (pins.length === 0) {
      toast.error("No pins to schedule.");
      return;
    }
    const start = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) {
      toast.error("Invalid start date.");
      return;
    }
    const stepDays =
      cadence === "single_day"
        ? 0
        : cadence === "daily"
          ? 1
          : cadence === "every_other_day"
            ? 2
            : 7;

    const entries = pins.map((pin, i) => {
      const offset = cadence === "single_day" ? 0 : i * stepDays;
      return {
        scheduled_for: isoDate(addDays(start, offset)),
        scheduled_time: time || null,
        content_type: "pin",
        title: pin.title || `Pin ${pin.index}`,
        run_id: runId,
        run_type: runType,
        pin_index: pin.index,
        payload: {
          description: pin.description,
          hook: pin.hook,
          visual_prompt_photorealistic: pin.visual_prompt_photorealistic,
          visual_prompt_illustrated: pin.visual_prompt_illustrated,
        },
      };
    });

    setSubmitting(true);
    try {
      const res = await fetch("/api/calendar/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; count?: number; error?: string }
        | null;
      if (!res.ok || !body?.ok) {
        const err =
          body?.error ??
          `Calendar API returned ${res.status} ${res.statusText}.`;
        toast.error(err);
        return;
      }
      toast.success(
        `Scheduled ${body.count ?? entries.length} pin${
          (body.count ?? entries.length) === 1 ? "" : "s"
        } to your calendar.`
      );
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      toast.error(`Failed to schedule: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar size={16} className="text-deep-espresso" />
            Add to Calendar
          </DialogTitle>
          <DialogDescription>
            Schedule the generated pins on your content calendar. You can edit
            individual entries later from the Calendar page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal mb-1">
              Start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm bg-warm-ivory border border-warm-taupe/40 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal mb-1">
              Time of day
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full text-sm bg-warm-ivory border border-warm-taupe/40 rounded-lg px-3 py-2"
            />
          </div>

          {pins.length > 1 && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal mb-1">
                Cadence
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["single_day", "All on one day"],
                    ["daily", "One per day"],
                    ["every_other_day", "Every other day"],
                    ["weekly", "Weekly"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCadence(value)}
                    className={`text-xs rounded-lg border px-3 py-2 transition-all active:scale-[0.98] ${
                      cadence === value
                        ? "border-deep-espresso bg-deep-espresso text-warm-ivory"
                        : "border-warm-taupe/40 bg-warm-ivory text-charcoal hover:bg-cream-hover"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-warm-taupe/30 bg-warm-ivory/50 px-3 py-2 text-xs text-charcoal">
            {pins.length === 0
              ? "No pins to schedule."
              : `Will schedule ${pins.length} pin${
                  pins.length === 1 ? "" : "s"
                }.`}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-warm-taupe"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={submitting || pins.length === 0}
            className="bg-deep-espresso text-warm-ivory hover:bg-deep-espresso/90"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" />
                Scheduling…
              </>
            ) : (
              `Schedule ${pins.length} pin${pins.length === 1 ? "" : "s"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
