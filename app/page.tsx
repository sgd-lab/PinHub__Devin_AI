"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";

export default function Home() {
  const router = useRouter();
  const onboardingComplete = useUIStore((s) => s.onboardingComplete);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (useUIStore.persist.hasHydrated()) {
      setHasHydrated(true);
      return;
    }
    const unsub = useUIStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (onboardingComplete) {
      router.replace("/dashboard");
    } else {
      router.replace("/onboarding");
    }
  }, [hasHydrated, onboardingComplete, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-charcoal font-serif text-lg italic">
        Loading Atelier...
      </div>
    </div>
  );
}
