"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useUserStore } from "@/stores/userStore";
import { AssistantPanel } from "./AssistantPanel";

/**
 * Floating chat button (bottom-right). Opens the persistent AI Creative
 * Assistant panel. Hidden until the user is authenticated and onboarded
 * (so the assistant always has creator context to reference).
 */
export function AssistantFab() {
  const [open, setOpen] = useState(false);
  const { authUser, profile, loaded } = useUserStore();

  if (!loaded) return null;
  if (!authUser) return null;
  if (!profile?.onboarding_completed) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-deep-espresso text-warm-ivory shadow-xl hover:bg-deep-espresso/90 hover:scale-105 transition-transform flex items-center justify-center"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>
      {open && <AssistantPanel onClose={() => setOpen(false)} />}
    </>
  );
}
