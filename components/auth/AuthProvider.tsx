"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/db/supabase";
import { fetchUserProfile } from "@/lib/auth/userProfileRepository";
import { fetchUserPreferences } from "@/lib/auth/userPreferencesRepository";
import { fetchBrandMemory } from "@/lib/auth/brandMemoryRepository";
import { buildBrandProfileFromUser } from "@/lib/brands/userBrandAdapter";
import { useUserStore } from "@/stores/userStore";
import { useBrandStore } from "@/stores/brandStore";
import type {
  UserTaskPromptDTO,
  UserTaskPromptKind,
} from "@/lib/prompts/types";

async function fetchUserTaskPrompts(): Promise<
  Partial<Record<UserTaskPromptKind, UserTaskPromptDTO>>
> {
  try {
    const res = await fetch("/api/prompts/tasks", { cache: "no-store" });
    if (!res.ok) return {};
    const json = (await res.json()) as { prompts?: UserTaskPromptDTO[] };
    const map: Partial<Record<UserTaskPromptKind, UserTaskPromptDTO>> = {};
    for (const p of json.prompts ?? []) {
      map[p.task] = p;
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Loads the user's profile, preferences, and brand memory after Google login
 * and seeds the global stores so the generation pipeline + Prompt Studio can
 * see personalized data immediately.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    setAuthUser,
    setProfile,
    setPreferences,
    setMemory,
    setTaskPrompts,
    setLoaded,
    setLoading,
    reset,
  } = useUserStore();
  const { setBrands, setActiveBrand } = useBrandStore();

  const loadingRef = useRef(false);

  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      // Supabase not configured — leave stores empty; UI will show a
      // "configure Supabase" message on the login page.
      setLoaded(true);
      return;
    }

    let cancelled = false;

    const loadEverything = async (
      authId: string,
      authEmail: string | null,
      authName: string | null,
      authAvatar: string | null
    ) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        setAuthUser({
          id: authId,
          email: authEmail,
          name: authName,
          avatarUrl: authAvatar,
        });

        const [profile, prefs, memory, taskPrompts] = await Promise.all([
          fetchUserProfile(authId),
          fetchUserPreferences(authId),
          fetchBrandMemory(authId),
          fetchUserTaskPrompts(),
        ]);

        if (cancelled) return;

        setProfile(profile);
        setPreferences(prefs);
        setMemory(memory);
        setTaskPrompts(taskPrompts);

        // Synthesize a BrandProfile from the user's data and seed the
        // legacy brandStore so existing pages keep working unchanged.
        if (profile && profile.onboarding_completed) {
          const synthesized = buildBrandProfileFromUser(profile, prefs, memory);
          setBrands([synthesized]);
          setActiveBrand(synthesized.id);
        } else if (profile) {
          // Onboarding still pending — clear any stale brand to prevent
          // accidentally generating with somebody else's hardcoded brand.
          setBrands([]);
        }
      } finally {
        loadingRef.current = false;
        if (!cancelled) {
          setLoading(false);
          setLoaded(true);
        }
      }
    };

    // Initial load — read whatever session exists right now.
    sb.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) {
        setLoaded(true);
        return;
      }
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      void loadEverything(
        user.id,
        user.email ?? null,
        ((meta.full_name as string) ||
          (meta.name as string) ||
          null) as string | null,
        (meta.avatar_url as string) ?? null
      );
    });

    const { data: subscription } = sb.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        if (event === "SIGNED_OUT" || !session) {
          reset();
          setBrands([]);
          setLoaded(true);
          if (
            pathname &&
            !pathname.startsWith("/login") &&
            !pathname.startsWith("/auth")
          ) {
            router.replace("/login");
          }
          return;
        }

        const user = session.user;
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        await loadEverything(
          user.id,
          user.email ?? null,
          ((meta.full_name as string) ||
            (meta.name as string) ||
            null) as string | null,
          (meta.avatar_url as string) ?? null
        );
      }
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
