"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  costMeterVisible: boolean;
  commandPaletteOpen: boolean;
  assistantOpen: boolean;
  theme: "warm-ivory" | "dark-atelier";
  fontSize: "sm" | "md" | "lg";
  density: "compact" | "comfortable" | "spacious";
  libraryDefaultView: "grid" | "list" | "compact";
  streamingAnimation: boolean;
  commandUsage: Record<string, number>;
  onboardingComplete: boolean;
  onboardingStep: number;
  onboardingChecklist: {
    loadBrandDefaults: boolean;
    addApiKeys: boolean;
    generateFirstPin: boolean;
    connectNotion: boolean;
    generateFirstGuide: boolean;
  };
  toggleSidebar: () => void;
  toggleCostMeter: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setAssistantOpen: (open: boolean) => void;
  toggleAssistant: () => void;
  setTheme: (theme: "warm-ivory" | "dark-atelier") => void;
  setFontSize: (size: "sm" | "md" | "lg") => void;
  setDensity: (density: "compact" | "comfortable" | "spacious") => void;
  setLibraryDefaultView: (view: "grid" | "list" | "compact") => void;
  setStreamingAnimation: (enabled: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setOnboardingStep: (step: number) => void;
  updateOnboardingChecklist: (key: keyof UIState["onboardingChecklist"], value: boolean) => void;
  incrementCommandUsage: (command: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      costMeterVisible: true,
      commandPaletteOpen: false,
      assistantOpen: false,
      theme: "warm-ivory",
      fontSize: "md",
      density: "comfortable",
      libraryDefaultView: "grid",
      streamingAnimation: true,
      commandUsage: {},
      onboardingComplete: false,
      onboardingStep: 0,
      onboardingChecklist: {
        loadBrandDefaults: false,
        addApiKeys: false,
        generateFirstPin: false,
        connectNotion: false,
        generateFirstGuide: false,
      },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleCostMeter: () => set((s) => ({ costMeterVisible: !s.costMeterVisible })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setAssistantOpen: (open) => set({ assistantOpen: open }),
      toggleAssistant: () => set((s) => ({ assistantOpen: !s.assistantOpen })),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setDensity: (density) => set({ density }),
      setLibraryDefaultView: (libraryDefaultView) => set({ libraryDefaultView }),
      setStreamingAnimation: (streamingAnimation) => set({ streamingAnimation }),
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      updateOnboardingChecklist: (key, value) =>
        set((s) => ({
          onboardingChecklist: { ...s.onboardingChecklist, [key]: value },
        })),
      incrementCommandUsage: (command) =>
        set((s) => ({
          commandUsage: {
            ...s.commandUsage,
            [command]: (s.commandUsage[command] || 0) + 1,
          },
        })),
    }),
    { name: "pinhub-ui-store" }
  )
);
