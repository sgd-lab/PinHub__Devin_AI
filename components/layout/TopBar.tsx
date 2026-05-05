"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, User, Sun, Moon, LogOut, Settings, HelpCircle, X } from "lucide-react";
import { BrandSwitcher } from "./BrandSwitcher";
import { useUIStore } from "@/stores/uiStore";
import { supabase } from "@/lib/db/supabase";
import { toast } from "sonner";

function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Welcome to PinHub!", body: "Your atelier workspace is ready. Start generating pins.", time: "Just now", read: false },
    { id: 2, title: "Brand Profile Loaded", body: "Maya Sofia defaults have been applied.", time: "Today", read: false },
    { id: 3, title: "Tip: Set up API Keys", body: "Configure Gemini or OpenRouter to start generating content.", time: "Today", read: false },
  ]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const handleNotificationClick = (id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div ref={ref} className="absolute right-16 top-12 w-80 bg-white/95 dark-panel border border-warm-taupe/30 rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-taupe/20">
        <h3 className="text-sm font-medium">Notifications</h3>
        <button onClick={onClose} className="p-1 hover:bg-cream-hover rounded"><X size={14} /></button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => handleNotificationClick(n.id)}
            className={`px-4 py-3 border-b border-warm-taupe/10 hover:bg-cream-hover/50 cursor-pointer ${n.read ? "opacity-60" : ""}`}
          >
            <p className="text-xs font-medium">{n.title}</p>
            <p className="text-[10px] text-charcoal mt-0.5">{n.body}</p>
            <p className="text-[10px] text-warm-taupe mt-1">{n.time}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-warm-taupe/20 text-center">
        <button onClick={handleMarkAllRead} className="text-[10px] text-dusty-rose hover:underline">Mark all as read</button>
      </div>
    </div>
  );
}

function UserMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useUIStore();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(({ data }) => {
        setUserEmail(data.user?.email || null);
      });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div ref={ref} className="absolute right-4 top-12 w-56 bg-white/95 dark-panel border border-warm-taupe/30 rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-warm-taupe/20">
        <p className="text-sm font-medium">{userEmail || "PinHub User"}</p>
        <p className="text-[10px] text-charcoal">Atelier Workspace</p>
      </div>
      <div className="py-1">
        <button
          onClick={() => { setTheme(theme === "warm-ivory" ? "dark-atelier" : "warm-ivory"); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-cream-hover text-left"
        >
          {theme === "warm-ivory" ? <Moon size={14} /> : <Sun size={14} />}
          {theme === "warm-ivory" ? "Dark Mode" : "Light Mode"}
        </button>
        <button
          onClick={() => { router.push("/settings"); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-cream-hover text-left"
        >
          <Settings size={14} />
          Settings
        </button>
        <button
          onClick={() => { toast.info("Help & Support — Coming soon. Check docs or contact the developer."); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-cream-hover text-left"
        >
          <HelpCircle size={14} />
          Help & Support
        </button>
      </div>
      <div className="border-t border-warm-taupe/20 py-1">
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push("/login"); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-cream-hover text-left text-red-500"
        >
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
