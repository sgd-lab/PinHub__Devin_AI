"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let onboardingComplete = false;
    try {
      const stored = localStorage.getItem("pinhub-ui-store");
      if (stored) {
        const parsed = JSON.parse(stored);
        onboardingComplete = parsed?.state?.onboardingComplete === true;
      }
    } catch {
      // localStorage unavailable or corrupt — fall through to onboarding
    }

    if (onboardingComplete) {
      router.replace("/dashboard");
    } else {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-charcoal font-serif text-lg italic">
        Loading Atelier...
      </div>
    </div>
  );
}
