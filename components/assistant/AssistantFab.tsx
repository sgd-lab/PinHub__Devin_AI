"use client";

import { Sparkles, X } from "lucide-react";
import { useUserStore } from "@/stores/userStore";
import { useUIStore } from "@/stores/uiStore";
import { AssistantPanel } from "./AssistantPanel";

/**
 * Floating chat button (bottom-right) that opens the persistent AI Creative
 * Assistant panel. Hidden for un-authenticated users. The open state lives
 * in `useUIStore` so other surfaces (e.g. the TopBar "AI Assistant" button)
 * can open the same panel.
 */
export function AssistantFab() {
  const { authUser, loaded } = useUserStore();
  const { assistantOpen, toggleAssistant, setAssistantOpen } = useUIStore();

  if (!loaded) return null;
  if (!authUser) return null;

  return (
    <>
      <button
        onClick={toggleAssistant}
        aria-label={assistantOpen ? "Close AI assistant" : "Open AI assistant"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-deep-espresso text-warm-ivory shadow-xl hover:bg-deep-espresso/90 hover:scale-105 transition-transform flex items-center justify-center"
      >
        {assistantOpen ? <X size={22} /> : <Sparkles size={22} />}
      </button>
      {assistantOpen && (
        <AssistantPanel onClose={() => setAssistantOpen(false)} />
      )}
    </>
  );
}
