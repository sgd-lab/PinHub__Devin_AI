"use client";

import { create } from "zustand";

export interface GenerationRun {
  id: string;
  status: "idle" | "assembling" | "resolving" | "preflight" | "dispatching" | "streaming" | "parsing" | "validating" | "storing" | "syncing" | "complete" | "error";
  progress: number;
  rawResponse: string;
  parsedFields: Record<string, unknown>;
  qcResults: { score: number; rules: Array<{ id: string; status: "pass" | "warn" | "fail"; message?: string }> } | null;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
  startedAt: string | null;
  completedAt: string | null;
}

interface GeneratorState {
  currentRun: GenerationRun;
  runHistory: GenerationRun[];
  holdForReview: boolean;
  selectedProvider: string;
  selectedModel: string;
  temperature: number;
  maxTokens: number;
  selectedNiche: string;
  selectedBrandId: string;
  selectedPromptId: string;
  targetDate: string;
  itemOverride: string;
  seasonalNote: string;
  boardAssignment: string;
  researchAllowed: boolean;
  setRunStatus: (status: GenerationRun["status"]) => void;
  appendToResponse: (text: string) => void;
  setCurrentRun: (run: Partial<GenerationRun>) => void;
  resetRun: () => void;
  setHoldForReview: (hold: boolean) => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setSelectedNiche: (niche: string) => void;
  setTargetDate: (date: string) => void;
}

const initialRun: GenerationRun = {
  id: "",
  status: "idle",
  progress: 0,
  rawResponse: "",
  parsedFields: {},
  qcResults: null,
  error: null,
  inputTokens: 0,
  outputTokens: 0,
  costEstimate: 0,
  startedAt: null,
  completedAt: null,
};

export const useGeneratorStore = create<GeneratorState>()((set) => ({
  currentRun: { ...initialRun },
  runHistory: [],
  holdForReview: false,
  selectedProvider: "nvidia",
  selectedModel: "",
  temperature: 0.7,
  maxTokens: 2000,
  selectedNiche: "auto",
  selectedBrandId: "",
  selectedPromptId: "",
  targetDate: new Date().toISOString().split("T")[0],
  itemOverride: "",
  seasonalNote: "",
  boardAssignment: "",
  researchAllowed: false,
  setRunStatus: (status) =>
    set((s) => ({ currentRun: { ...s.currentRun, status } })),
  appendToResponse: (text) =>
    set((s) => ({
      currentRun: {
        ...s.currentRun,
        rawResponse: s.currentRun.rawResponse + text,
      },
    })),
  setCurrentRun: (run) =>
    set((s) => ({ currentRun: { ...s.currentRun, ...run } })),
  resetRun: () => set({ currentRun: { ...initialRun } }),
  setHoldForReview: (hold) => set({ holdForReview: hold }),
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setTemperature: (temp) => set({ temperature: temp }),
  setMaxTokens: (tokens) => set({ maxTokens: tokens }),
  setSelectedNiche: (niche) => set({ selectedNiche: niche }),
  setTargetDate: (date) => set({ targetDate: date }),
}));
