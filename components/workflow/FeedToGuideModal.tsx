"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGuideContextStore } from "@/stores/guideContextStore";
import type { ParsedPin } from "@/lib/parsing/pinSections";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pins: ParsedPin[];
  runId: string | null;
  runType: string | null;
  niche: string | null;
}

export function FeedToGuideModal({
  open,
  onOpenChange,
  pins,
  runId,
  runType,
  niche,
}: Props) {
  const router = useRouter();
  const setPending = useGuideContextStore((s) => s.setPending);
  const [selected, setSelected] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(pins.map((p) => [p.index, true]))
  );

  const toggle = (idx: number) =>
    setSelected((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const chosen = pins.filter((p) => selected[p.index]);

  const handleFeed = () => {
    if (chosen.length === 0) {
      toast.error("Pick at least one pin to feed into the guide.");
      return;
    }
    setPending({
      source_run_id: runId,
      source_run_type: runType,
      source_niche: niche,
      pins: chosen,
      created_at: new Date().toISOString(),
    });
    toast.success(
      `Fed ${chosen.length} pin${chosen.length === 1 ? "" : "s"} into Guide Generator.`
    );
    onOpenChange(false);
    router.push("/generate/guide?from=workflow");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={16} className="text-deep-espresso" />
            Feed pins to Guide Generator
          </DialogTitle>
          <DialogDescription>
            The Guide Generator will use the selected pins as context — it
            will reference their titles, descriptions, and visual prompts
            when expanding into a long-form guide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {pins.length === 0 && (
            <div className="text-xs text-charcoal py-4 text-center">
              No pins detected in the current generation.
            </div>
          )}
          {pins.map((pin) => {
            const isChecked = Boolean(selected[pin.index]);
            return (
              <button
                key={pin.index}
                type="button"
                onClick={() => toggle(pin.index)}
                className={`w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-all active:scale-[0.98] hover:shadow-sm ${
                  isChecked
                    ? "border-deep-espresso bg-cream-hover/60"
                    : "border-warm-taupe/40 bg-warm-ivory hover:bg-cream-hover"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                    isChecked
                      ? "border-deep-espresso bg-deep-espresso text-warm-ivory"
                      : "border-warm-taupe/60 bg-white"
                  }`}
                >
                  {isChecked && <Check size={10} strokeWidth={3} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs uppercase tracking-wider text-warm-taupe">
                    {pin.label}
                  </span>
                  <span className="block text-sm text-deep-espresso truncate">
                    {pin.title || "Untitled pin"}
                  </span>
                  {pin.description && (
                    <span className="block text-xs text-charcoal line-clamp-2 mt-0.5">
                      {pin.description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-warm-taupe"
          >
            Cancel
          </Button>
          <Button
            onClick={handleFeed}
            disabled={chosen.length === 0}
            className="bg-deep-espresso text-warm-ivory hover:bg-deep-espresso/90"
          >
            Open Guide Generator ({chosen.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
