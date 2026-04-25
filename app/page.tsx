"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";

export default function Home() {
  const router = useRouter();
  const { onboardingComplete } = useUIStore();

  useEffect(() => {
    if (onboardingComplete) {
      router.replace("/dashboard");
    } else {
      router.replace("/onboarding");
    }
  }, [onboardingComplete, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-charcoal font-serif text-lg italic">
        Loading Atelier...
      </div>
    </div>
  );
}
