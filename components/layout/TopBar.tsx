"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, User, Sun, Moon, LogOut, Settings, HelpCircle, X } from "lucide-react";
import { BrandSwitcher } from "./BrandSwitcher";
import { useUIStore } from "@/stores/uiStore";

function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} className="absolute right-16 top-12 w-80 bg-white/95 dark-panel border border-warm-taupe/30 rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-taupe/20">
        <h3 className="text-sm font-medium">Notifications</h3>
        <button onClick={onClose} className="p-1 hover:bg-cream-hover rounded"><X size={14} /></button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <div className="px-4 py-3 border-b border-warm-taupe/10 hover:bg-cream-hover/50 cursor-pointer">
          <p className="text-xs font-medium">Welcome to PinHub!</p>
          <p className="text-[10px] text-charcoal mt-0.5">Your atelier workspace is ready. Start generating pins.</p>
          <p className="text-[10px] text-warm-taupe mt-1">Just now</p>
        </div>
        <div className="px-4 py-3 border-b border-warm-taupe/10 hover:bg-cream-hover/50 cursor-pointer">
          <p className="text-xs font-medium">Brand Profile Loaded</p>
          <p className="text-[10px] text-charcoal mt-0.5">Maya Sofia defaults have been applied.</p>
          <p className="text-[10px] text-warm-taupe mt-1">Today</p>
        </div>
        <div className="px-4 py-3 hover:bg-cream-hover/50 cursor-pointer">
          <p className="text-xs font-medium">Tip: Set up API Keys</p>
          <p className="text-[10px] text-charcoal mt-0.5">Configure NVIDIA or OpenRouter to start generating content.</p>
          <p className="text-[10px] text-warm-taupe mt-1">Today</p>
        </div>
      </div>
      <div className="px-4 py-2 border-t border-warm-taupe/20 text-center">
        <button className="text-[10px] text-dusty-rose hover:underline">Mark all as read</button>
      </div>
    </div>
  );
}

function UserMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useUIStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} className="absolute right-4 top-12 w-56 bg-white/95 dark-panel border border-warm-taupe/30 rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-warm-taupe/20">
        <p className="text-sm font-medium">Ahsan</p>
        <p className="text-[10px] text-charcoal">Maya Sofia Atelier</p>
      </div>
      <div className="py-1">
        <button
          onClick={() => { setTheme(theme === "warm-ivory" ? "dark-atelier" : "warm-ivory"); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-cream-hover text-left"
        >
          {theme === "warm-ivory" ? <Moon size={14} /> : <Sun size={14} />}
          {theme === "warm-ivory" ? "Dark Mode" : "Light Mode"}
        </button>
        <a href="/settings" className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-cream-hover">
          <Settings size={14} />
          Settings
        </a>
        <button className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-cream-hover text-left">
          <HelpCircle size={14} />
          Help & Support
        </button>
      </div>
      <div className="border-t border-warm-taupe/20 py-1">
        <button className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-cream-hover text-left text-red-500">
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const { setCommandPaletteOpen } = useUIStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (pathname === "/onboarding") return null;

  const breadcrumb = pathname
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1));

  return (
    <header className="h-14 border-b border-warm-taupe/30 bg-warm-ivory/60 backdrop-blur-sm px-6 flex items-center justify-between shrink-0 relative">
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

        <button
          onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
          className="relative p-2 text-charcoal hover:bg-cream-hover rounded-lg transition-colors"
        >
          <Bell size={18} strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-dusty-rose rounded-full" />
        </button>

        <button
          onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
          className="w-8 h-8 bg-dusty-rose/30 rounded-full flex items-center justify-center text-deep-espresso hover:bg-dusty-rose/50 transition-colors"
        >
          <User size={16} strokeWidth={1.5} />
        </button>
      </div>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
      <UserMenu open={userMenuOpen} onClose={() => setUserMenuOpen(false)} />
    </header>
  );
}
