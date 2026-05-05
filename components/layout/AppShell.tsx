"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CostMeter } from "@/components/layout/CostMeter";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth/");

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <div className="hidden sm:block">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNav />
      <CostMeter />
      <CommandPalette />
    </>
  );
}
