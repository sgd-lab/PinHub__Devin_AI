"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { isSupabaseConfigured } from "@/lib/db/supabase";

export default function Home() {
  const router = useRouter();
  const { authUser, profile, loaded } = useUserStore();

  useEffect(() => {
    if (!loaded) return;

    if (!isSupabaseConfigured()) {
      router.replace("/login");
      return;
    }

    if (!authUser) {
      router.replace("/login");
      return;
    }

    if (!profile?.onboarding_completed) {
      router.replace("/onboarding");
      return;
    }

    router.replace("/dashboard");
  }, [authUser, profile, loaded, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-warm-ivory">
      <div className="animate-pulse text-charcoal font-serif text-lg italic">
        Loading Atelier...
      </div>
    </div>
  );
}
