"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Real Automation Hub. Three sections — same names as the original
 * placeholder ("Scheduled Runs", "Calendar Fill", "Notion Auto-Sync") so
 * muscle memory is preserved, but each one is now wired to live state:
 *
 *   1. Scheduled Daily Runs — toggle + time + content type + manual "Run now"
 *   2. Calendar Fill        — toggle + days-ahead + manual "Fill now"
 *   3. Notion Auto-Sync     — toggle (consumed by the post-generation push)
 *
 * State is persisted server-side in `automation_settings` (one row per
 * user). The page never owns truth — it re-reads from the API after a
 * write so what you see matches what's saved. Manual triggers stay
 * available even when the corresponding auto-toggle is off.
 */

interface AutomationSettings {
  user_id: string;
  daily_run_enabled: boolean;
  daily_run_time: string;
  daily_content_type: "daily" | "single" | "three";
  calendar_fill_enabled: boolean;
  calendar_fill_days_ahead: number;
  notion_auto_sync_enabled: boolean;
}

const DEFAULT: Omit<AutomationSettings, "user_id"> = {
  daily_run_enabled: false,
  daily_run_time: "06:00",
  daily_content_type: "daily",
  calendar_fill_enabled: false,
  calendar_fill_days_ahead: 7,
  notion_auto_sync_enabled: false,
};

export default function AutomationPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filling, setFilling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/automation/settings", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { settings: AutomationSettings };
        if (!cancelled) setSettings(data.settings);
      } catch (e) {
        console.error("[automation] load failed", e);
        if (!cancelled) {
          toast.error("Couldn't load automation settings — using defaults.");
          setSettings({ user_id: "", ...DEFAULT });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = async (update: Partial<AutomationSettings>) => {
    if (!settings) return;
    setSaving(true);
    const prev = settings;
    setSettings({ ...settings, ...update });
    try {
      const res = await fetch("/api/automation/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `status ${res.status}`);
      }
      const data = (await res.json()) as { settings: AutomationSettings };
      setSettings(data.settings);
    } catch (e) {
      console.error("[automation] patch failed", e);
      setSettings(prev);
      toast.error("Couldn't save that change. Try again?");
    } finally {
      setSaving(false);
    }
  };

  const handleFillNow = async () => {
    setFilling(true);
    try {
      const res = await fetch("/api/automation/calendar-fill", {
        method: "POST",
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `status ${res.status}`);
      }
      const data = (await res.json()) as {
        inserted: number;
        days_ahead: number;
      };
      if (data.inserted === 0) {
        toast.success(
          `No empty days in the next ${data.days_ahead} — your calendar is already full.`
        );
      } else {
        toast.success(
          `Filled ${data.inserted} day${
            data.inserted === 1 ? "" : "s"
          } with placeholders.`
        );
      }
    } catch (e) {
      console.error("[automation] fill failed", e);
      toast.error("Couldn't fill the calendar. Try again?");
    } finally {
      setFilling(false);
    }
  };

  const handleRunNow = () => {
    if (!settings) return;
    const type = settings.daily_content_type;
    const route =
      type === "single"
        ? "/generate/single"
        : type === "three"
          ? "/generate/daily"
          : "/generate/daily";
    toast.success("Opening generator — press Generate to start the run.");
    router.push(route);
  };

  if (loading || !settings) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-charcoal">
        Loading automation settings…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-deep-espresso">
            Automation Hub
          </h2>
          <p className="text-sm text-charcoal mt-1">
            Schedule recurring runs, keep your calendar populated, and mirror
            successful generations to Notion automatically.
          </p>
        </div>
        <span className="text-[10px] bg-soft-sage/20 text-soft-sage px-3 py-1 rounded-full uppercase tracking-wider font-medium">
          {saving ? "Saving…" : "Live"}
        </span>
      </div>

      <Section
        icon={Clock}
        title="Scheduled Daily Runs"
        subtitle="Auto-generate a fresh batch every day. Until cron lands, use 'Run now' to fire one immediately."
      >
        <ToggleRow
          label="Enable scheduled daily runs"
          help="When on, PinHub will queue a generation for the time below. (Cron handler ships next — for now use Run now.)"
          checked={settings.daily_run_enabled}
          onChange={(v) => patch({ daily_run_enabled: v })}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <Field label="Time of day">
            <input
              type="time"
              value={settings.daily_run_time.slice(0, 5)}
              onChange={(e) => patch({ daily_run_time: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-warm-taupe/40 bg-warm-ivory text-deep-espresso text-sm"
            />
          </Field>
          <Field label="Content type">
            <select
              value={settings.daily_content_type}
              onChange={(e) =>
                patch({
                  daily_content_type: e.target.value as
                    | "daily"
                    | "single"
                    | "three",
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-warm-taupe/40 bg-warm-ivory text-deep-espresso text-sm"
            >
              <option value="daily">Daily drop</option>
              <option value="three">Three pins</option>
              <option value="single">Single pin</option>
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Button
            onClick={handleRunNow}
            className="bg-deep-espresso text-warm-ivory rounded-lg active:scale-95 transition-transform"
          >
            <Play size={14} className="mr-2" />
            Run now
          </Button>
        </div>
      </Section>

      <Section
        icon={Calendar}
        title="Calendar Fill"
        subtitle="Make sure the calendar always has a queue — auto-create draft entries on empty days."
      >
        <ToggleRow
          label="Auto-fill empty days"
          help="Inserts draft placeholders on any future day that doesn't already have an entry."
          checked={settings.calendar_fill_enabled}
          onChange={(v) => patch({ calendar_fill_enabled: v })}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <Field label="Days ahead">
            <input
              type="number"
              min={1}
              max={30}
              value={settings.calendar_fill_days_ahead}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                if (!Number.isFinite(n)) return;
                patch({
                  calendar_fill_days_ahead: Math.min(30, Math.max(1, n)),
                });
              }}
              className="w-full px-3 py-2 rounded-lg border border-warm-taupe/40 bg-warm-ivory text-deep-espresso text-sm"
            />
          </Field>
          <Field label="\u00a0">
            <Button
              onClick={handleFillNow}
              disabled={filling}
              variant="outline"
              className="w-full border-warm-taupe text-deep-espresso rounded-lg active:scale-95 transition-transform"
            >
              {filling ? (
                "Filling…"
              ) : (
                <>
                  <Sparkles size={14} className="mr-2" />
                  Fill empty days now
                </>
              )}
            </Button>
          </Field>
        </div>
      </Section>

      <Section
        icon={Send}
        title="Notion Auto-Sync"
        subtitle="Push generated pins to your connected Notion database the moment they're saved."
      >
        <ToggleRow
          label="Auto-push successful generations to Notion"
          help="Requires a connected Notion integration — set one up in Settings → Integrations."
          checked={settings.notion_auto_sync_enabled}
          onChange={(v) => patch({ notion_auto_sync_enabled: v })}
        />
        <div className="mt-3">
          <Button
            variant="outline"
            onClick={() => router.push("/settings/integrations")}
            className="border-warm-taupe text-deep-espresso rounded-lg active:scale-95 transition-transform"
          >
            Manage integrations
          </Button>
        </div>
      </Section>

      <div className="bg-warm-ivory/60 border border-warm-taupe/30 rounded-lg p-4 text-xs text-charcoal flex items-start gap-2">
        <CheckCircle2 size={14} className="text-soft-sage mt-0.5 shrink-0" />
        <div>
          Manual triggers always work — toggle the schedule on/off later.
          Daily generation runs through your active brand and the provider
          chosen per task in Settings → API Keys.
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Zap;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5">
      <header className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-muted-gold/15 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-muted-gold" />
        </div>
        <div>
          <h3 className="font-serif text-lg text-deep-espresso">{title}</h3>
          <p className="text-xs text-charcoal mt-0.5">{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer select-none">
      <div className="flex-1">
        <div className="text-sm text-deep-espresso font-medium">{label}</div>
        {help && <div className="text-xs text-charcoal mt-0.5">{help}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-dusty-rose focus:ring-offset-2 ${
          checked ? "bg-deep-espresso" : "bg-warm-taupe/40"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-warm-ivory shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-warm-taupe block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
