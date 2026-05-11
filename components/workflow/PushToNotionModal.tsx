"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ParsedPin } from "@/lib/parsing/pinSections";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pins: ParsedPin[];
  runId: string | null;
  runType: string | null;
}

interface NotionDatabase {
  id: string;
  title: string;
  icon: string | null;
  url: string | null;
}

interface NotionStatusResponse {
  notion?: {
    connected: boolean;
    token_hint: string | null;
    metadata: Record<string, unknown>;
  };
}

export function PushToNotionModal({
  open,
  onOpenChange,
  pins,
  runId,
  runType,
}: Props) {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connected, setConnected] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [databases, setDatabases] = useState<NotionDatabase[] | null>(null);
  const [databasesLoading, setDatabasesLoading] = useState(false);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingStatus(true);
    fetch("/api/integrations/notion/status")
      .then((r) => r.json())
      .then((data: NotionStatusResponse) => {
        if (cancelled) return;
        const isConnected = Boolean(data?.notion?.connected);
        setConnected(isConnected);
        const ws = data?.notion?.metadata?.workspace_name;
        setWorkspaceName(typeof ws === "string" ? ws : null);
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      })
      .finally(() => {
        if (!cancelled) setLoadingStatus(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const loadDatabases = async () => {
    setDatabasesLoading(true);
    try {
      const res = await fetch("/api/integrations/notion/databases");
      const body = (await res.json().catch(() => null)) as
        | { databases?: NotionDatabase[]; error?: string }
        | null;
      if (!res.ok) {
        toast.error(body?.error ?? "Failed to load Notion databases.");
        setDatabases([]);
        return;
      }
      setDatabases(body?.databases ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      toast.error(`Failed to load Notion databases: ${msg}`);
      setDatabases([]);
    } finally {
      setDatabasesLoading(false);
    }
  };

  useEffect(() => {
    if (open && connected && databases === null) {
      loadDatabases();
    }
  }, [open, connected, databases]);

  const handlePush = async () => {
    if (!selectedDb) {
      toast.error("Pick a database first.");
      return;
    }
    if (pins.length === 0) {
      toast.error("No pins to push.");
      return;
    }
    setPushing(true);
    try {
      const res = await fetch("/api/integrations/notion/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database_id: selectedDb,
          pins: pins.map((p) => ({
            title: p.title || `Pin ${p.index}`,
            description: p.description,
            hook: p.hook,
            caption: p.caption,
            visual_prompt_photorealistic: p.visual_prompt_photorealistic,
            visual_prompt_illustrated: p.visual_prompt_illustrated,
            run_id: runId,
            run_type: runType,
            pin_index: p.index,
          })),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            pushed?: number;
            total?: number;
            error?: string;
            results?: Array<{ ok: boolean; title: string; error?: string }>;
          }
        | null;

      if (!res.ok || !body?.ok) {
        toast.error(body?.error ?? `Push failed (${res.status}).`);
        return;
      }
      const pushed = body.pushed ?? 0;
      const total = body.total ?? pins.length;
      if (pushed === total) {
        toast.success(`Pushed all ${pushed} pin${pushed === 1 ? "" : "s"} to Notion.`);
      } else {
        toast.warning(
          `Pushed ${pushed} of ${total} pin${total === 1 ? "" : "s"}. Some failed — check Notion.`
        );
      }
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      toast.error(`Push failed: ${msg}`);
    } finally {
      setPushing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send size={16} className="text-deep-espresso" />
            Push to Notion
          </DialogTitle>
          <DialogDescription>
            Create one Notion page per pin in a database you share with the
            PinHub integration.
          </DialogDescription>
        </DialogHeader>

        {loadingStatus ? (
          <div className="text-xs text-charcoal py-6 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Checking Notion connection…
          </div>
        ) : !connected ? (
          <div className="rounded-lg border border-warm-taupe/40 bg-warm-ivory/50 p-4 space-y-3">
            <p className="text-sm text-deep-espresso">
              Notion isn&apos;t connected yet.
            </p>
            <p className="text-xs text-charcoal">
              Open Settings → Integrations to paste your Notion Internal
              Integration Token, then share a database with the integration.
            </p>
            <Link
              href="/settings/integrations"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1 text-xs underline text-deep-espresso hover:text-charcoal"
            >
              Open Integrations settings →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-warm-taupe/30 bg-warm-ivory/50 px-3 py-2 text-xs text-charcoal flex items-center justify-between">
              <span>
                Connected
                {workspaceName ? (
                  <> as <strong className="text-deep-espresso">{workspaceName}</strong></>
                ) : null}
              </span>
              <button
                type="button"
                onClick={loadDatabases}
                disabled={databasesLoading}
                className="text-xs text-deep-espresso hover:underline flex items-center gap-1 transition-all active:scale-95"
              >
                <RefreshCw
                  size={11}
                  className={databasesLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal mb-1">
                Destination database
              </label>
              {databasesLoading ? (
                <div className="text-xs text-charcoal py-4 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  Loading databases…
                </div>
              ) : !databases || databases.length === 0 ? (
                <div className="rounded-lg border border-warm-taupe/40 bg-warm-ivory/50 p-3 text-xs text-charcoal">
                  No databases visible. In Notion, open the database, click
                  the three-dot menu → &quot;Add connections&quot; → invite
                  your PinHub integration. Then click Refresh above.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {databases.map((db) => (
                    <button
                      key={db.id}
                      type="button"
                      onClick={() => setSelectedDb(db.id)}
                      className={`w-full text-left flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all active:scale-[0.99] ${
                        selectedDb === db.id
                          ? "border-deep-espresso bg-cream-hover/60"
                          : "border-warm-taupe/40 bg-warm-ivory hover:bg-cream-hover"
                      }`}
                    >
                      <span className="text-base leading-none w-5 text-center">
                        {db.icon ?? "📓"}
                      </span>
                      <span className="flex-1 truncate text-deep-espresso">
                        {db.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-warm-taupe"
            disabled={pushing}
          >
            Cancel
          </Button>
          {connected && (
            <Button
              onClick={handlePush}
              disabled={pushing || !selectedDb || pins.length === 0}
              className="bg-deep-espresso text-warm-ivory hover:bg-deep-espresso/90"
            >
              {pushing ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                  Pushing…
                </>
              ) : (
                `Push ${pins.length} pin${pins.length === 1 ? "" : "s"}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
