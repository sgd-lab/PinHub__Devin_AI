"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Star, X } from "lucide-react";
import { toast } from "sonner";
import {
  recordOutputRating,
  clearOutputRating,
  type OutputRating,
} from "@/lib/ai/outputRatings";
import type { RunType } from "@/lib/ai/contextualPromptAssembler";

interface Props {
  runId: string | null;
  runType: RunType;
  niche: string;
  snippet: string;
  initialRating?: OutputRating | null;
  onChange?: (rating: OutputRating | null) => void;
  /** Compact label-less mode for tight UIs. */
  compact?: boolean;
}

const RATING_LABELS: Record<OutputRating, string> = {
  successful: "Successful",
  weak: "Weak",
  favorite: "Favorite",
};

export function OutputRatingControls({
  runId,
  runType,
  niche,
  snippet,
  initialRating = null,
  onChange,
  compact = false,
}: Props) {
  const [rating, setRating] = useState<OutputRating | null>(initialRating);
  const [busy, setBusy] = useState(false);

  if (!runId) return null;

  const apply = async (next: OutputRating) => {
    if (busy) return;
    setBusy(true);
    const previous = rating;
    setRating(next);
    onChange?.(next);
    const res = await recordOutputRating({
      runId,
      rating: next,
      runType,
      niche,
      snippet,
    });
    setBusy(false);
    if (!res.ok) {
      setRating(previous);
      onChange?.(previous);
      toast.error(`Failed to save rating: ${res.error}`);
      return;
    }
    toast.success(`Marked as ${RATING_LABELS[next].toLowerCase()}.`);
  };

  const clear = async () => {
    if (busy || !rating) return;
    setBusy(true);
    const previous = rating;
    setRating(null);
    onChange?.(null);
    const res = await clearOutputRating(runId);
    setBusy(false);
    if (!res.ok) {
      setRating(previous);
      onChange?.(previous);
      toast.error(`Failed to clear rating: ${res.error}`);
      return;
    }
    toast.success("Rating cleared.");
  };

  const btn = (
    kind: OutputRating,
    icon: React.ReactNode,
    color: string,
    activeColor: string
  ) => (
    <button
      key={kind}
      onClick={() => (rating === kind ? clear() : apply(kind))}
      disabled={busy}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-50 ${
        rating === kind
          ? `${activeColor} text-warm-ivory border-transparent`
          : `bg-warm-ivory border-warm-taupe/40 text-charcoal hover:${color}`
      }`}
      title={`Mark as ${RATING_LABELS[kind].toLowerCase()}`}
    >
      {icon}
      {!compact && <span>{RATING_LABELS[kind]}</span>}
    </button>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!compact && (
        <span className="text-xs text-warm-taupe">Rate this output:</span>
      )}
      {btn(
        "successful",
        <ThumbsUp size={14} />,
        "bg-soft-sage/10",
        "bg-soft-sage"
      )}
      {btn(
        "weak",
        <ThumbsDown size={14} />,
        "bg-red-100",
        "bg-red-500"
      )}
      {btn(
        "favorite",
        <Star size={14} />,
        "bg-muted-gold/10",
        "bg-muted-gold"
      )}
      {rating && !compact && (
        <button
          onClick={clear}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-lg text-warm-taupe hover:text-deep-espresso disabled:opacity-50"
          title="Clear rating"
        >
          <X size={12} />
          Clear
        </button>
      )}
    </div>
  );
}
