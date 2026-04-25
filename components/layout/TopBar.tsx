"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, User } from "lucide-react";
import { BrandSwitcher } from "./BrandSwitcher";
import { useUIStore } from "@/stores/uiStore";

export function TopBar() {
  const pathname = usePathname();
  const { setCommandPaletteOpen } = useUIStore();

  if (pathname === "/onboarding") return null;

  const breadcrumb = pathname
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1));

  return (
    <header className="h-14 border-b border-warm-taupe/30 bg-warm-ivory/60 backdrop-blur-sm px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-warm-taupe">Atelier</span>
        {breadcrumb.map((seg, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="text-warm-taupe">/</span>
            <span className={i === breadcrumb.length - 1 ? "text-deep-espresso font-medium" : "text-charcoal"}>
              {seg}
            </span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-charcoal bg-warm-ivory border border-warm-taupe/40 rounded-lg hover:bg-cream-hover transition-colors"
        >
          <Search size={14} strokeWidth={1.5} />
          <span className="hidden md:inline">Search...</span>
          <kbd className="hidden md:inline text-[10px] bg-warm-taupe/20 px-1.5 py-0.5 rounded">
            Ctrl+K
          </kbd>
        </button>

        <BrandSwitcher />

        <button className="relative p-2 text-charcoal hover:bg-cream-hover rounded-lg transition-colors">
          <Bell size={18} strokeWidth={1.5} />
        </button>

        <button className="w-8 h-8 bg-dusty-rose/30 rounded-full flex items-center justify-center text-deep-espresso">
          <User size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
