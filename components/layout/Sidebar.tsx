"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Library,
  Calendar,
  Palette,
  FileText,
  BarChart3,
  Search,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "1" },
  { href: "/generate/single", label: "Generate", icon: Sparkles, shortcut: "2" },
  { href: "/library", label: "Content Library", icon: Library, shortcut: "3" },
  { href: "/calendar", label: "Content Calendar", icon: Calendar, shortcut: "4" },
  { href: "/brands", label: "Brand Profiles", icon: Palette, shortcut: "5" },
  { href: "/prompts", label: "Prompt Studio", icon: FileText, shortcut: "6" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, shortcut: "7" },
  { href: "/research-enhancer", label: "Research", icon: Search, shortcut: "8" },
  { href: "/export", label: "Export Center", icon: Download, shortcut: "9" },
  { href: "/settings", label: "Settings", icon: Settings, shortcut: "0" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  if (pathname === "/onboarding") return null;

  return (
    <aside
      className={cn(
        "bg-warm-ivory/80 border-r border-warm-taupe/30 flex flex-col h-full transition-all duration-300 relative",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className={cn("p-4 border-b border-warm-taupe/30", sidebarCollapsed && "px-2")}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-deep-espresso rounded-lg flex items-center justify-center">
            <span className="text-warm-ivory font-serif text-sm font-bold">P</span>
          </div>
          {!sidebarCollapsed && (
            <span className="font-serif text-lg font-semibold text-deep-espresso italic">
              PinHub
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-deep-espresso text-warm-ivory"
                  : "text-charcoal hover:bg-cream-hover",
                sidebarCollapsed && "justify-center px-2"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon size={20} strokeWidth={1.5} />
              {!sidebarCollapsed && (
                <span className="flex-1">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-warm-taupe/30">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-charcoal hover:bg-cream-hover rounded-lg transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight size={16} strokeWidth={1.5} />
          ) : (
            <>
              <ChevronLeft size={16} strokeWidth={1.5} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      <div className={cn("px-3 pb-3 text-[10px] text-warm-taupe", sidebarCollapsed && "hidden")}>
        Encrypted at rest &middot; Privacy first
      </div>
    </aside>
  );
}
