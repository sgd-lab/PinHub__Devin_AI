"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { isSupabaseConfigured } from "@/lib/db/supabase";

export default function Home() {
  const router = useRouter();
  const { authUser, profile, loaded } = useUserStore();
  const [stuck, setStuck] = useState(false);

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

  // Safety net: if the user store never resolves (e.g. Supabase session check
  // hangs or AuthProvider errored before flipping `loaded`), don't hold the
  // user on this spinner forever — bounce them to /login after 8s.
  useEffect(() => {
    if (loaded) return;
    const timeout = setTimeout(() => {
      if (!loaded) {
        setStuck(true);
        router.replace("/login");
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [loaded, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-warm-ivory gap-3">
      <div className="animate-pulse text-charcoal font-serif text-lg italic">
        Loading Atelier...
      </div>
      {stuck && (
        <p className="text-xs text-warm-taupe italic">
          Taking a moment — redirecting you to the login screen.
        </p>
      )}
    </div>
  );
}
