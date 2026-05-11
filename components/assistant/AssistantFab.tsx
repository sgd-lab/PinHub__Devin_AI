"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useUserStore } from "@/stores/userStore";
import { AssistantPanel } from "./AssistantPanel";

/**
 * Floating chat button (bottom-right). Opens the persistent AI Creative
 * Assistant panel.
 *
 * Positioned at `bottom-6 right-6` so it sits BELOW the CostMeter widget
 * (which lives at `bottom-24 right-4`) — they share the right column but
 * never overlap vertically. We render the FAB as soon as the user is
 * authenticated (no onboarding gate) so it can never silently disappear.
 */
export function AssistantFab() {
  const [open, setOpen] = useState(false);
  const { authUser, loaded } = useUserStore();

  if (!loaded) return null;
  if (!authUser) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        title={open ? "Close AI assistant" : "Open AI Creative Assistant"}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-deep-espresso text-warm-ivory shadow-xl hover:bg-deep-espresso/90 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center ring-2 ring-warm-ivory"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>
      {open && <AssistantPanel onClose={() => setOpen(false)} />}
    </>
  );
}
