"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ParsedPin } from "@/lib/parsing/pinSections";

/**
 * Holds a payload of generated pins that should be fed into the Guide
 * Generator on the next visit to /generate/guide. Persisted in
 * sessionStorage so a hard refresh keeps it but a new browser tab does
 * not surface stale context.
 */
interface GuideContext {
  source_run_id: string | null;
  source_run_type: string | null;
  source_niche: string | null;
  pins: ParsedPin[];
  created_at: string;
}

interface GuideContextStore {
  pending: GuideContext | null;
  setPending: (ctx: GuideContext) => void;
  clearPending: () => void;
}

export const useGuideContextStore = create<GuideContextStore>()(
  persist(
    (set) => ({
      pending: null,
      setPending: (ctx) => set({ pending: ctx }),
      clearPending: () => set({ pending: null }),
    }),
    {
      name: "pinhub-guide-context",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : (undefined as never)
      ),
    }
  )
);
