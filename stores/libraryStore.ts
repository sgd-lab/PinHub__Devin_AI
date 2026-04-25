"use client";

import { create } from "zustand";
import type { RunRecord } from "@/lib/db/dexie";

interface LibraryState {
  runs: RunRecord[];
  selectedIds: string[];
  filters: {
    brands: string[];
    niches: string[];
    status: string;
    shotTypes: string[];
    qcPass: boolean | null;
    search: string;
    sortBy: "recent" | "oldest" | "niche" | "status" | "qc" | "cost";
  };
  view: "grid" | "list" | "compact";
  page: number;
  pageSize: number;
  setRuns: (runs: RunRecord[]) => void;
  addRun: (run: RunRecord) => void;
  updateRun: (id: string, updates: Partial<RunRecord>) => void;
  removeRun: (id: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setFilter: (key: string, value: unknown) => void;
  clearFilters: () => void;
  setView: (view: "grid" | "list" | "compact") => void;
  setPage: (page: number) => void;
}

export const useLibraryStore = create<LibraryState>()((set) => ({
  runs: [],
  selectedIds: [],
  filters: {
    brands: [],
    niches: [],
    status: "",
    shotTypes: [],
    qcPass: null,
    search: "",
    sortBy: "recent",
  },
  view: "grid",
  page: 1,
  pageSize: 20,
  setRuns: (runs) => set({ runs }),
  addRun: (run) => set((s) => ({ runs: [run, ...s.runs] })),
  updateRun: (id, updates) =>
    set((s) => ({
      runs: s.runs.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),
  removeRun: (id) =>
    set((s) => ({
      runs: s.runs.filter((r) => r.id !== id),
      selectedIds: s.selectedIds.filter((sid) => sid !== id),
    })),
  toggleSelect: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((sid) => sid !== id)
        : [...s.selectedIds, id],
    })),
  selectAll: () => set((s) => ({ selectedIds: s.runs.map((r) => r.id) })),
  clearSelection: () => set({ selectedIds: [] }),
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  clearFilters: () =>
    set({
      filters: {
        brands: [],
        niches: [],
        status: "",
        shotTypes: [],
        qcPass: null,
        search: "",
        sortBy: "recent",
      },
    }),
  setView: (view) => set({ view }),
  setPage: (page) => set({ page }),
}));
