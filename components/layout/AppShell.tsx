"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CostMeter } from "@/components/layout/CostMeter";
import { CommandPalette } from "@/components/layout/CommandPalette";

const FULL_BLEED_PATHS = ["/login", "/onboarding"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const fullBleed =
    FULL_BLEED_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    ) || pathname.startsWith("/auth/");

  if (fullBleed) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
      <CostMeter />
      <CommandPalette />
    </>
  );
}
