"use client";

import { useState } from "react";
import { Loader2, Save, Star } from "lucide-react";
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

export function SaveToLibraryModal({
  open,
  onOpenChange,
  pins,
  runId,
  runType,
}: Props) {
  const [selected, setSelected] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(pins.map((p) => [p.index, true]))
  );
  const [favorite, setFavorite] = useState(false);
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const chosen = pins.filter((p) => selected[p.index]);

  const handleSave = async () => {
    if (chosen.length === 0) {
      toast.error("Pick at least one pin to save.");
      return;
    }
    const tagsArr = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setSubmitting(true);
    try {
      const res = await fetch("/api/library/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: chosen.map((p) => ({
            title: p.title || `Pin ${p.index}`,
            description: p.description ?? null,
            visual_prompt:
              p.visual_prompt_photorealistic ?? p.visual_prompt_illustrated ?? null,
            thumbnail_url: null,
            run_id: runId,
            run_type: runType,
            pin_index: p.index,
            is_favorite: favorite,
            tags: tagsArr,
            payload: {
              hook: p.hook,
              caption: p.caption,
              visual_prompt_photorealistic: p.visual_prompt_photorealistic,
              visual_prompt_illustrated: p.visual_prompt_illustrated,
              sections: p.sections,
            },
          })),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; count?: number; error?: string }
        | null;
      if (!res.ok || !body?.ok) {
        toast.error(body?.error ?? `Failed to save (${res.status}).`);
        return;
      }
      toast.success(
        `Saved ${body.count ?? chosen.length} item${
          (body.count ?? chosen.length) === 1 ? "" : "s"
        } to your library.`
      );
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      toast.error(`Failed to save: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save size={16} className="text-deep-espresso" />
            Save to Library
          </DialogTitle>
          <DialogDescription>
            Pick which pins to save. Saved items appear in the Library page
            under <strong>Saved Items</strong> and can be filtered by tag or
            favorite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {pins.map((pin) => {
            const isChecked = Boolean(selected[pin.index]);
            return (
              <button
                key={pin.index}
                type="button"
                onClick={() =>
                  setSelected((prev) => ({ ...prev, [pin.index]: !prev[pin.index] }))
                }
                className={`w-full text-left flex items-start gap-2 rounded-lg border p-2.5 transition-all active:scale-[0.98] ${
                  isChecked
                    ? "border-deep-espresso bg-cream-hover/60"
                    : "border-warm-taupe/40 bg-warm-ivory hover:bg-cream-hover"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border ${
                    isChecked
                      ? "border-deep-espresso bg-deep-espresso text-warm-ivory"
                      : "border-warm-taupe/60 bg-white"
                  }`}
                >
                  {isChecked && <span className="text-[10px]">✓</span>}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-warm-taupe">
                    {pin.label}
                  </span>
                  <span className="block text-sm text-deep-espresso truncate">
                    {pin.title || "Untitled pin"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-charcoal cursor-pointer">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              className="accent-deep-espresso"
            />
            <Star
              size={12}
              className={favorite ? "text-muted-gold fill-muted-gold" : "text-warm-taupe"}
            />
            Mark as favorite
          </label>
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. evening, capsule, hero"
              className="w-full text-sm bg-warm-ivory border border-warm-taupe/40 rounded-lg px-3 py-2"
            />
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
            onClick={handleSave}
            disabled={submitting || chosen.length === 0}
            className="bg-deep-espresso text-warm-ivory hover:bg-deep-espresso/90"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" />
                Saving…
              </>
            ) : (
              `Save ${chosen.length} item${chosen.length === 1 ? "" : "s"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
