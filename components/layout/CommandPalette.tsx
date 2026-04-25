"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Sparkles,
  Library,
  Calendar,
  Palette,
  FileText,
  BarChart3,
  Zap,
  Download,
  Settings,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

const commands = [
  { label: "Dashboard", icon: LayoutDashboard, action: "/dashboard", keywords: ["home", "overview"] },
  { label: "Generate Single Pin", icon: Sparkles, action: "/generate/single", keywords: ["create", "pin", "single"] },
  { label: "Generate Today's 3 Pins", icon: Sparkles, action: "/generate/daily", keywords: ["generate today", "daily", "3 pins"] },
  { label: "Generate Guide", icon: FileText, action: "/generate/guide", keywords: ["guide", "weekly"] },
  { label: "Run Mega Week", icon: Zap, action: "/generate/mega", keywords: ["mega", "full week", "run mega"] },
  { label: "Content Library", icon: Library, action: "/library", keywords: ["library", "runs", "content"] },
  { label: "Content Calendar", icon: Calendar, action: "/calendar", keywords: ["calendar", "schedule"] },
  { label: "Brand Profiles", icon: Palette, action: "/brands", keywords: ["brand", "maya sofia", "profile"] },
  { label: "Prompt Studio", icon: FileText, action: "/prompts", keywords: ["prompt", "template", "studio"] },
  { label: "Analytics", icon: BarChart3, action: "/analytics", keywords: ["analytics", "insights", "stats"] },
  { label: "Automation Hub", icon: Zap, action: "/automation", keywords: ["automation", "schedule"] },
  { label: "Export Center", icon: Download, action: "/export", keywords: ["export", "download", "backup"] },
  { label: "Settings", icon: Settings, action: "/settings", keywords: ["settings", "preferences", "config"] },
  { label: "API Keys", icon: Settings, action: "/settings/api-keys", keywords: ["api", "keys", "nvidia", "openrouter"] },
];

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen, incrementCommandUsage } = useUIStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }

      // Keyboard shortcuts Ctrl+1..0
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const num = parseInt(e.key);
        if (num >= 0 && num <= 9) {
          e.preventDefault();
          const routes = [
            "/settings",
            "/dashboard",
            "/generate/single",
            "/library",
            "/calendar",
            "/brands",
            "/prompts",
            "/analytics",
            "/automation",
            "/export",
          ];
          router.push(routes[num]);
        }
      }

      // Ctrl+G: Quick Generate
      if ((e.metaKey || e.ctrlKey) && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        router.push("/generate/daily");
      }

      // Ctrl+E: Export
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        router.push("/export");
      }

      // Ctrl+/: Shortcuts overlay
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        // TODO: Show shortcuts overlay
      }
    },
    [commandPaletteOpen, setCommandPaletteOpen, router]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {commands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.action}
                onSelect={() => {
                  router.push(cmd.action);
                  setCommandPaletteOpen(false);
                  incrementCommandUsage(cmd.label);
                }}
                className="cursor-pointer"
              >
                <Icon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span>{cmd.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
