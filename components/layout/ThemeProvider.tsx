"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark-atelier") {
      root.classList.add("dark-atelier");
    } else {
      root.classList.remove("dark-atelier");
    }
  }, [theme]);

  return <>{children}</>;
}
