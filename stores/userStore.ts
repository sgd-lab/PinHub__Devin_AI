"use client";

import { create } from "zustand";
import type {
  BrandMemoryEntry,
  UserPreferences,
  UserProfile,
} from "@/lib/auth/types";
import type {
  UserTaskPromptDTO,
  UserTaskPromptKind,
} from "@/lib/prompts/types";

interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

interface UserState {
  authUser: AuthUser | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  memory: BrandMemoryEntry[];
  taskPrompts: Partial<Record<UserTaskPromptKind, UserTaskPromptDTO>>;
  loaded: boolean;
  loading: boolean;
  setAuthUser: (user: AuthUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setPreferences: (prefs: UserPreferences | null) => void;
  setMemory: (memory: BrandMemoryEntry[]) => void;
  setTaskPrompts: (
    prompts: Partial<Record<UserTaskPromptKind, UserTaskPromptDTO>>
  ) => void;
  upsertTaskPrompt: (prompt: UserTaskPromptDTO) => void;
  removeTaskPrompt: (task: UserTaskPromptKind) => void;
  setLoaded: (loaded: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  authUser: null,
  profile: null,
  preferences: null,
  memory: [],
  taskPrompts: {},
  loaded: false,
  loading: false,
  setAuthUser: (authUser) => set({ authUser }),
  setProfile: (profile) => set({ profile }),
  setPreferences: (preferences) => set({ preferences }),
  setMemory: (memory) => set({ memory }),
  setTaskPrompts: (taskPrompts) => set({ taskPrompts }),
  upsertTaskPrompt: (prompt) =>
    set((s) => ({
      taskPrompts: { ...s.taskPrompts, [prompt.task]: prompt },
    })),
  removeTaskPrompt: (task) =>
    set((s) => {
      const next = { ...s.taskPrompts };
      delete next[task];
      return { taskPrompts: next };
    }),
  setLoaded: (loaded) => set({ loaded }),
  setLoading: (loading) => set({ loading }),
  reset: () =>
    set({
      authUser: null,
      profile: null,
      preferences: null,
      memory: [],
      taskPrompts: {},
      loaded: false,
      loading: false,
    }),
}));
