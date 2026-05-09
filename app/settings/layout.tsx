"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Key, Settings2, Monitor, Shield, Bell, Wrench, User } from "lucide-react";

const settingsNav = [
  { href: "/settings/profile", label: "Profile & Brand", icon: User },
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
      <h2 className="font-serif text-2xl text-deep-espresso mb-6">Settings</h2>
      <div className="flex gap-6">
        <div className="w-48 shrink-0 space-y-0.5">
          {settingsNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${isActive ? "bg-deep-espresso text-warm-ivory" : "text-charcoal hover:bg-cream-hover"}`}>
                <Icon size={14} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
