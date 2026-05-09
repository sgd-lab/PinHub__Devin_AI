"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Key,
  Check,
  Trash2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  PROVIDERS,
  PROVIDER_IDS,
  type ProviderId,
  type AITaskKind,
  type ModelInfo,
} from "@/lib/ai/providers/types";
import { toast } from "sonner";

interface KeyStatus {
  provider: ProviderId;
  key_hint: string | null;
  is_valid: boolean;
  last_validated_at: string | null;
}

interface ProviderSettings {
  provider: ProviderId;
  enabled: boolean;
  default_model: string | null;
  available_models: ModelInfo[];
  models_fetched_at: string | null;
}

interface ModelPreference {
  task: AITaskKind;
  provider: ProviderId;
  model: string;
  fallback_provider: ProviderId | null;
  fallback_model: string | null;
}

const TASKS: { id: AITaskKind; label: string; description: string }[] = [
  {
    id: "pin",
    label: "Pin generation",
    description: "Single pin + 3-pin daily producer",
  },
  {
    id: "guide",
    label: "Guide generation",
    description: "Long-form guides and articles",
  },
  {
    id: "inspiration",
    label: "Inspiration",
    description: "Mood / inspiration boards",
  },
  {
    id: "chat",
    label: "AI chat assistant",
    description: "Future persistent chat",
  },
];

export default function ApiKeysPage() {
  const [cryptoConfigured, setCryptoConfigured] = useState(true);
  const [keys, setKeys] = useState<KeyStatus[]>([]);
  const [settings, setSettings] = useState<ProviderSettings[]>([]);
  const [preferences, setPreferences] = useState<ModelPreference[]>([]);
  const [drafts, setDrafts] = useState<Record<ProviderId, string>>(
    {} as Record<ProviderId, string>
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [keysRes, prefsRes] = await Promise.all([
        fetch("/api/ai/keys", { cache: "no-store" }),
        fetch("/api/ai/preferences", { cache: "no-store" }),
      ]);
      if (keysRes.status === 401) {
        toast.error("Sign in to manage API keys");
        return;
      }
      const keysJson = await keysRes.json();
      const prefsJson = await prefsRes.json();
      setCryptoConfigured(Boolean(keysJson.crypto_configured));
      setKeys(keysJson.keys ?? []);
      setSettings(keysJson.settings ?? []);
      setPreferences(prefsJson.preferences ?? []);
    } catch (e) {
      toast.error(`Failed to load: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const keyFor = (p: ProviderId) => keys.find((k) => k.provider === p);
  const settingsFor = (p: ProviderId) =>
    settings.find((s) => s.provider === p);
  const prefFor = (t: AITaskKind) =>
    preferences.find((pref) => pref.task === t);

  const handleSaveKey = async (provider: ProviderId) => {
    const value = (drafts[provider] || "").trim();
    if (!value) {
      toast.error("Enter an API key first");
      return;
    }
    setBusy(`save:${provider}`);
    try {
      const res = await fetch("/api/ai/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: value }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        toast.error(j.error || "Failed to save key");
      } else {
        toast.success(`${PROVIDERS[provider].label} connected`);
        setDrafts((d) => ({ ...d, [provider]: "" }));
        await loadAll();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleValidate = async (provider: ProviderId) => {
    const value = (drafts[provider] || "").trim();
    if (!value) {
      toast.error("Enter a key to test");
      return;
    }
    setBusy(`validate:${provider}`);
    try {
      const res = await fetch("/api/ai/keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: value }),
      });
      const j = await res.json();
      if (j.ok) {
        toast.success(
          j.models_count
            ? `Valid — ${j.models_count} models available`
            : "Valid"
        );
      } else {
        toast.error(j.error || "Invalid key");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteKey = async (provider: ProviderId) => {
    setBusy(`delete:${provider}`);
    try {
      const res = await fetch(
        `/api/ai/keys?provider=${encodeURIComponent(provider)}`,
        { method: "DELETE" }
      );
      const j = await res.json();
      if (!res.ok || !j.ok) {
        toast.error(j.error || "Failed to remove key");
      } else {
        toast.success(`${PROVIDERS[provider].label} removed`);
        await loadAll();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleToggleEnabled = async (
    provider: ProviderId,
    enabled: boolean
  ) => {
    setBusy(`toggle:${provider}`);
    try {
      const res = await fetch("/api/ai/providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, enabled }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error || "Failed to update");
      } else {
        await loadAll();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleSetDefaultModel = async (
    provider: ProviderId,
    model: string
  ) => {
    setBusy(`model:${provider}`);
    try {
      const res = await fetch("/api/ai/providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, default_model: model }),
      });
      if (!res.ok) {
        const j = await res.json();
        toast.error(j.error || "Failed to update");
      } else {
        await loadAll();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleRefreshModels = async (provider: ProviderId) => {
    setBusy(`models:${provider}`);
    try {
      const res = await fetch(
        `/api/ai/models?provider=${encodeURIComponent(provider)}&force=true`,
        { cache: "no-store" }
      );
      const j = await res.json();
      if (!res.ok || !j.ok) {
        toast.error(j.error || "Failed to fetch models");
      } else {
        toast.success(`${j.models?.length ?? 0} models loaded`);
        await loadAll();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleSetPreference = async (
    task: AITaskKind,
    provider: ProviderId,
    model: string
  ) => {
    setBusy(`pref:${task}`);
    try {
      const res = await fetch("/api/ai/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, provider, model }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error || "Failed");
      } else {
        await loadAll();
        toast.success("Saved");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleClearPreference = async (task: AITaskKind) => {
    setBusy(`pref:${task}`);
    try {
      const res = await fetch(
        `/api/ai/preferences?task=${encodeURIComponent(task)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const j = await res.json();
        toast.error(j.error || "Failed");
      } else {
        await loadAll();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-serif text-deep-espresso mb-1">
            API Keys
          </h3>
          <p className="text-xs text-charcoal">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-serif text-deep-espresso mb-1">
          AI Providers & API Keys
        </h3>
        <p className="text-xs text-charcoal">
          Keys are encrypted server-side with AES-256-GCM and never returned to
          the browser. Only the last 4 characters are shown as a hint.
        </p>
      </div>

      {!cryptoConfigured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 text-sm flex gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-medium mb-1">
              Server encryption secret is not set
            </div>
            <div className="text-xs">
              Set the <code>PINHUB_KEY_ENC_SECRET</code> environment variable
              (base64 of 32 random bytes —{" "}
              <code>openssl rand -base64 32</code>) on the server. Until then,
              saving keys is disabled.
            </div>
          </div>
        </div>
      )}

      {/* Providers */}
      <section className="space-y-4">
        <h4 className="text-sm font-medium text-deep-espresso">Providers</h4>

        {PROVIDER_IDS.map((id) => {
          const info = PROVIDERS[id];
          const k = keyFor(id);
          const s = settingsFor(id);
          const connected = !!k;
          const enabled = s?.enabled ?? false;
          const models = s?.available_models ?? [];
          const defaultModel = s?.default_model || info.fallback_default_model;

          return (
            <div
              key={id}
              className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-charcoal" />
                  <span className="text-sm font-medium text-deep-espresso">
                    {info.label}
                  </span>
                  {connected ? (
                    <span className="flex items-center gap-1 text-xs text-soft-sage">
                      <Check size={10} />
                      Connected
                      {k.key_hint && (
                        <span className="text-warm-taupe ml-1">
                          ({k.key_hint})
                        </span>
                      )}
                    </span>
                  ) : (
                    <a
                      href={info.signup_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-dusty-rose hover:underline flex items-center gap-1"
                    >
                      Get a key <ExternalLink size={10} />
                    </a>
                  )}
                  {connected && k && !k.is_valid && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      Last call rejected — re-test or replace
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enabled}
                    disabled={!connected || busy === `toggle:${id}`}
                    onCheckedChange={(checked) =>
                      handleToggleEnabled(id, checked)
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <Input
                  type="password"
                  value={drafts[id] || ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [id]: e.target.value }))
                  }
                  placeholder={
                    connected
                      ? "Replace key…"
                      : `Enter ${info.label} API key…`
                  }
                  className="bg-warm-ivory border-warm-taupe/40 rounded-lg text-sm"
                  autoComplete="off"
                />
                <Button
                  onClick={() => handleValidate(id)}
                  disabled={
                    !cryptoConfigured ||
                    !drafts[id] ||
                    busy === `validate:${id}`
                  }
                  size="sm"
                  variant="outline"
                  className="border-warm-taupe rounded-lg"
                >
                  {busy === `validate:${id}` ? "Testing…" : "Test"}
                </Button>
                <Button
                  onClick={() => handleSaveKey(id)}
                  disabled={
                    !cryptoConfigured || !drafts[id] || busy === `save:${id}`
                  }
                  size="sm"
                  className="bg-deep-espresso text-warm-ivory rounded-lg"
                >
                  {busy === `save:${id}` ? "Saving…" : "Save"}
                </Button>
                {connected && (
                  <Button
                    onClick={() => handleDeleteKey(id)}
                    disabled={busy === `delete:${id}`}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-500 rounded-lg"
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>

              {connected && (
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-charcoal w-24 shrink-0">
                      Default model
                    </span>
                    <select
                      value={defaultModel}
                      onChange={(e) =>
                        handleSetDefaultModel(id, e.target.value)
                      }
                      disabled={busy === `model:${id}`}
                      className="bg-warm-ivory border border-warm-taupe/40 rounded-lg text-xs px-2 py-1.5 flex-1"
                    >
                      {models.length === 0 && (
                        <option value={defaultModel}>{defaultModel}</option>
                      )}
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => handleRefreshModels(id)}
                    disabled={busy === `models:${id}`}
                    className="text-xs text-dusty-rose hover:underline flex items-center gap-1 justify-self-start md:justify-self-end"
                  >
                    <RefreshCw size={12} />
                    {busy === `models:${id}`
                      ? "Refreshing…"
                      : models.length > 0
                      ? `Refresh models (${models.length})`
                      : "Fetch models"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Task assignments */}
      <section className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-deep-espresso">
            Task assignments
          </h4>
          <p className="text-[11px] text-charcoal">
            Pick which provider + model handles each task. If left empty, the
            generator falls back to the first enabled provider.
          </p>
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg divide-y divide-warm-taupe/30">
          {TASKS.map((task) => {
            const pref = prefFor(task.id);
            const enabledProviders = settings.filter(
              (s) => s.enabled && keyFor(s.provider)
            );
            const selectedProvider: ProviderId | "" = pref?.provider ?? "";
            const providerSettings = selectedProvider
              ? settingsFor(selectedProvider)
              : undefined;
            const modelOptions = providerSettings?.available_models ?? [];

            return (
              <div
                key={task.id}
                className="p-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center"
              >
                <div>
                  <div className="text-sm font-medium text-deep-espresso">
                    {task.label}
                  </div>
                  <div className="text-[11px] text-charcoal">
                    {task.description}
                  </div>
                </div>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    const p = e.target.value as ProviderId | "";
                    if (!p) {
                      void handleClearPreference(task.id);
                      return;
                    }
                    const s = settingsFor(p);
                    const m = s?.default_model || PROVIDERS[p].fallback_default_model;
                    void handleSetPreference(task.id, p, m);
                  }}
                  disabled={busy === `pref:${task.id}`}
                  className="bg-warm-ivory border border-warm-taupe/40 rounded-lg text-xs px-2 py-1.5"
                >
                  <option value="">Auto (first enabled)</option>
                  {enabledProviders.map((s) => (
                    <option key={s.provider} value={s.provider}>
                      {PROVIDERS[s.provider].label}
                    </option>
                  ))}
                </select>
                <select
                  value={pref?.model ?? ""}
                  onChange={(e) => {
                    if (!selectedProvider) return;
                    void handleSetPreference(
                      task.id,
                      selectedProvider,
                      e.target.value
                    );
                  }}
                  disabled={!selectedProvider || busy === `pref:${task.id}`}
                  className="bg-warm-ivory border border-warm-taupe/40 rounded-lg text-xs px-2 py-1.5 disabled:opacity-50"
                >
                  {!selectedProvider && <option value="">—</option>}
                  {selectedProvider && modelOptions.length === 0 && pref && (
                    <option value={pref.model}>{pref.model}</option>
                  )}
                  {modelOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id}
                    </option>
                  ))}
                </select>
                {pref && (
                  <button
                    onClick={() => handleClearPreference(task.id)}
                    className="text-xs text-charcoal hover:text-red-500 justify-self-end"
                    title="Clear assignment"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-charcoal">
          Need to update your brand voice instead?{" "}
          <Link
            href="/settings/profile"
            className="text-dusty-rose hover:underline"
          >
            Profile & Brand →
          </Link>
        </p>
      </section>
    </div>
  );
}
