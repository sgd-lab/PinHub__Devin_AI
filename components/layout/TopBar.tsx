"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Search, Settings, Sparkles, User } from "lucide-react";
import { BrandSwitcher } from "./BrandSwitcher";
import { useUIStore } from "@/stores/uiStore";
import { useUserStore } from "@/stores/userStore";
import { getSupabaseBrowserClient } from "@/lib/db/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setCommandPaletteOpen, toggleAssistant, assistantOpen } = useUIStore();
  const { authUser, profile, reset } = useUserStore();

  if (
    pathname === "/onboarding" ||
    pathname === "/login" ||
    pathname?.startsWith("/auth/")
  ) {
    return null;
  }

  const breadcrumb = (pathname ?? "")
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1));

  const handleSignOut = async () => {
    const sb = getSupabaseBrowserClient();
    if (sb) await sb.auth.signOut();
    reset();
    router.replace("/login");
  };

  const initial =
    profile?.display_name?.[0]?.toUpperCase() ||
    authUser?.email?.[0]?.toUpperCase() ||
    null;

  return (
    <header className="h-14 border-b border-warm-taupe/30 bg-warm-ivory/60 backdrop-blur-sm px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-warm-taupe">Atelier</span>
        {breadcrumb.map((seg, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="text-warm-taupe">/</span>
            <span
              className={
                i === breadcrumb.length - 1
                  ? "text-deep-espresso font-medium"
                  : "text-charcoal"
              }
            >
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

        {authUser && (
          <button
            onClick={toggleAssistant}
            aria-label={assistantOpen ? "Close AI assistant" : "Open AI assistant"}
            title="AI Creative Assistant"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors border ${
              assistantOpen
                ? "bg-deep-espresso text-warm-ivory border-deep-espresso"
                : "text-deep-espresso bg-warm-ivory border-warm-taupe/40 hover:bg-cream-hover"
            }`}
          >
            <Sparkles size={14} strokeWidth={1.5} />
            <span className="hidden md:inline">Assistant</span>
          </button>
        )}

        <button className="relative p-2 text-charcoal hover:bg-cream-hover rounded-lg transition-colors">
          <Bell size={18} strokeWidth={1.5} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 bg-dusty-rose/30 rounded-full flex items-center justify-center text-deep-espresso text-sm font-medium hover:bg-dusty-rose/50 transition-colors">
              {initial ?? <User size={16} strokeWidth={1.5} />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {authUser ? (
              <>
                <DropdownMenuLabel className="text-deep-espresso">
                  <div className="font-medium truncate">
                    {profile?.display_name || authUser.email || "Account"}
                  </div>
                  {authUser.email && (
                    <div className="text-[11px] text-charcoal truncate">
                      {authUser.email}
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push("/settings/profile")}
                >
                  <User size={14} className="mr-2" /> Edit profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push("/settings")}
                >
                  <Settings size={14} className="mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-500"
                  onClick={handleSignOut}
                >
                  <LogOut size={14} className="mr-2" /> Sign out
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push("/login")}
              >
                Sign in
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
