"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import {
  PROVIDERS,
  PROVIDER_IDS,
  type AITaskKind,
  type ProviderId,
  type ModelInfo,
} from "@/lib/ai/providers/types";
import { toast } from "sonner";

interface ResolvedInfo {
  task: AITaskKind;
  primary: { provider: ProviderId; model: string } | null;
  fallback: { provider: ProviderId; model: string } | null;
  reason?: "no_keys" | "no_enabled_provider" | "ok";
}

interface ProviderSettings {
  provider: ProviderId;
  enabled: boolean;
  default_model: string | null;
  available_models: ModelInfo[];
  models_fetched_at: string | null;
}

/**
 * Live read-out of which provider/model the server will pick for `task`,
 * with an inline override that writes through `/api/ai/preferences`.
 *
 * No hardcoded providers — pulls everything from `/api/ai/keys` +
 * `/api/ai/preferences/resolve`.
 */
export function ProviderTaskBadge({
  task,
  lastRunLabel,
  compact = false,
}: {
  task: AITaskKind;
  lastRunLabel?: string | null;
  compact?: boolean;
}) {
  const [info, setInfo] = useState<ResolvedInfo | null>(null);
  const [settings, setSettings] = useState<ProviderSettings[]>([]);
  const [hasKeys, setHasKeys] = useState<Set<ProviderId>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [resolveRes, keysRes] = await Promise.all([
        fetch(`/api/ai/preferences/resolve?task=${task}`, { cache: "no-store" }),
        fetch("/api/ai/keys", { cache: "no-store" }),
      ]);
      if (resolveRes.status === 401) {
        setLoading(false);
        return;
      }
      const resolved = (await resolveRes.json()) as ResolvedInfo;
      const keysJson = (await keysRes.json()) as {
        keys: Array<{ provider: ProviderId }>;
        settings: ProviderSettings[];
      };
      setInfo(resolved);
      setSettings(keysJson.settings ?? []);
      setHasKeys(new Set((keysJson.keys ?? []).map((k) => k.provider)));
    } catch {
      // network or auth issue — leave info null, render the no-provider state
    } finally {
      setLoading(false);
    }
  }, [task]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSelect = async (provider: ProviderId, model: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, provider, model }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Failed to save preference");
        return;
      }
      toast.success(`Set ${PROVIDERS[provider].label} for ${task}`);
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-xs text-charcoal bg-warm-ivory border border-warm-taupe/40 rounded-lg px-3 py-2">
        Loading provider…
      </div>
    );
  }

  if (!info || info.reason === "no_keys" || !info.primary) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <div className="font-medium mb-0.5">No AI provider configured</div>
        <Link
          href="/settings/api-keys"
          className="inline-flex items-center gap-1 underline"
        >
          <SettingsIcon size={11} /> Connect a provider
        </Link>
      </div>
    );
  }

  const primaryInfo = PROVIDERS[info.primary.provider];
  const fallbackInfo = info.fallback ? PROVIDERS[info.fallback.provider] : null;

  // Eligible options: any enabled provider with a stored key.
  const enabledProviders = PROVIDER_IDS.filter((p) => {
    const s = settings.find((x) => x.provider === p);
    return s?.enabled && hasKeys.has(p);
  });

  return (
    <div className="rounded-lg border border-warm-taupe/40 bg-warm-ivory px-3 py-2 text-xs text-charcoal">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] text-warm-taupe uppercase tracking-wider">
            Will use
          </div>
          <div className="text-deep-espresso font-medium">
            {primaryInfo.label}
            <span className="text-warm-taupe font-normal"> · </span>
            <span className="font-mono text-[11px]">{info.primary.model}</span>
          </div>
          {fallbackInfo && !compact && (
            <div className="text-[10px] text-warm-taupe mt-0.5">
              fallback: {fallbackInfo.label} · {info.fallback?.model}
            </div>
          )}
          {lastRunLabel && !compact && (
            <div className="text-[10px] text-warm-taupe mt-0.5">
              last run: {lastRunLabel}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing((e) => !e)}
            disabled={saving}
            className="px-2 py-1 rounded text-[11px] border border-warm-taupe/40 hover:bg-cream-hover flex items-center gap-1"
            title="Override for this task"
          >
            Change <ChevronDown size={11} />
          </button>
          <button
            onClick={() => void load()}
            className="p-1 rounded hover:bg-cream-hover"
            title="Refresh"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-2 border-t border-warm-taupe/30 pt-2 space-y-1">
          {enabledProviders.length === 0 && (
            <div className="text-[11px] text-warm-taupe">
              No enabled providers.{" "}
              <Link href="/settings/api-keys" className="underline">
                Add a key →
              </Link>
            </div>
          )}
          {enabledProviders.map((p) => {
            const s = settings.find((x) => x.provider === p);
            const models = s?.available_models ?? [];
            const defaultModel =
              s?.default_model || PROVIDERS[p].fallback_default_model;
            const optionList =
              models.length > 0 ? models : [{ id: defaultModel, name: defaultModel }];
            return (
              <details key={p} className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between py-1 hover:bg-cream-hover rounded px-1">
                  <span className="text-[11px] font-medium">
                    {PROVIDERS[p].label}
                  </span>
                  <ChevronDown
                    size={11}
                    className="transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="pl-2 pt-1 space-y-0.5 max-h-32 overflow-y-auto">
                  {optionList.map((m) => {
                    const isCurrent =
                      info.primary?.provider === p &&
                      info.primary?.model === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelect(p, m.id)}
                        disabled={saving || isCurrent}
                        className={`w-full text-left px-2 py-1 rounded text-[11px] font-mono truncate ${
                          isCurrent
                            ? "bg-deep-espresso/10 text-deep-espresso"
                            : "hover:bg-cream-hover"
                        }`}
                        title={m.id}
                      >
                        {m.id}
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          })}
          <Link
            href="/settings/api-keys"
            className="block text-[10px] text-dusty-rose hover:underline pt-1 border-t border-warm-taupe/30 mt-2"
          >
            Manage providers in Settings →
          </Link>
        </div>
      )}
    </div>
  );
}
