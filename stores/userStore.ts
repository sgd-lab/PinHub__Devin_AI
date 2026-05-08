"use client";

import { create } from "zustand";
import type {
  BrandMemoryEntry,
  UserPreferences,
  UserProfile,
} from "@/lib/auth/types";

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
  loaded: boolean;
  loading: boolean;
  setAuthUser: (user: AuthUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setPreferences: (prefs: UserPreferences | null) => void;
  setMemory: (memory: BrandMemoryEntry[]) => void;
  setLoaded: (loaded: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  authUser: null,
  profile: null,
  preferences: null,
  memory: [],
  loaded: false,
  loading: false,
  setAuthUser: (authUser) => set({ authUser }),
  setProfile: (profile) => set({ profile }),
  setPreferences: (preferences) => set({ preferences }),
  setMemory: (memory) => set({ memory }),
  setLoaded: (loaded) => set({ loaded }),
  setLoading: (loading) => set({ loading }),
  reset: () =>
    set({
      authUser: null,
      profile: null,
      preferences: null,
      memory: [],
      loaded: false,
      loading: false,
    }),
}));
