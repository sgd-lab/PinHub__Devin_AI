"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Key, Settings2, Monitor, Shield, Bell, Wrench } from "lucide-react";

const settingsNav = [
  { href: "/settings/api-keys", label: "API Keys", icon: Key },
  { href: "/settings/defaults", label: "Defaults", icon: Settings2 },
  { href: "/settings/ui", label: "UI Preferences", icon: Monitor },
  { href: "/settings/privacy", label: "Privacy & Security", icon: Shield },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/advanced", label: "Advanced", icon: Wrench },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="font-serif text-xl sm:text-2xl text-deep-espresso mb-4 sm:mb-6">Settings</h2>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <div className="w-full sm:w-48 shrink-0">
          <div className="flex sm:flex-col gap-1 overflow-x-auto pb-2 sm:pb-0 sm:space-y-0.5">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${isActive ? "bg-deep-espresso text-warm-ivory" : "text-charcoal hover:bg-cream-hover"}`}>
                  <Icon size={14} strokeWidth={1.5} />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
