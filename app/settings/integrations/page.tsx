"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Plug, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface NotionStatus {
  connected: boolean;
  token_hint: string | null;
  metadata: Record<string, unknown> | null;
  last_validated_at: string | null;
}

interface StatusResponse {
  crypto_configured: boolean;
  notion: NotionStatus;
}

export default function IntegrationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [cryptoConfigured, setCryptoConfigured] = useState(false);
  const [notion, setNotion] = useState<NotionStatus | null>(null);
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/notion/status");
      const body = (await res.json()) as StatusResponse;
      setCryptoConfigured(Boolean(body?.crypto_configured));
      setNotion(body?.notion ?? null);
    } catch {
      toast.error("Failed to load integration status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleConnect = async () => {
    if (!token.trim()) {
      toast.error("Paste your Notion Internal Integration Token first.");
      return;
    }
    if (!cryptoConfigured) {
      toast.error(
        "Encryption key not configured. Ask the admin to set PINHUB_KEY_ENC_SECRET."
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/integrations/notion/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; hint?: string; workspace_name?: string; error?: string }
        | null;
      if (!res.ok || !body?.ok) {
        toast.error(body?.error ?? `Failed (${res.status}).`);
        return;
      }
      toast.success(
        `Connected to Notion${body.workspace_name ? ` (${body.workspace_name})` : ""}.`
      );
      setToken("");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      toast.error(`Failed to connect: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Notion? PinHub will lose access until you re-paste the token.")) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/notion/disconnect", {
        method: "POST",
      });
      if (!res.ok) {
        toast.error(`Failed to disconnect (${res.status}).`);
        return;
      }
      toast.success("Notion disconnected.");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      toast.error(`Failed to disconnect: ${msg}`);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif text-xl text-deep-espresso mb-1">
          Integrations
        </h3>
        <p className="text-sm text-charcoal">
          Connect external apps so PinHub can push your generated content into
          tools you already use.
        </p>
      </div>

      {/* Notion card */}
      <div className="rounded-lg border border-warm-taupe/40 bg-white/60 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-warm-ivory border border-warm-taupe/40 p-2">
              <Plug size={18} className="text-deep-espresso" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-deep-espresso">Notion</h4>
                {loading ? (
                  <Loader2 size={12} className="animate-spin text-warm-taupe" />
                ) : notion?.connected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded-full bg-soft-sage/30 text-deep-espresso px-2 py-0.5">
                    <CheckCircle2 size={10} />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded-full bg-warm-taupe/30 text-charcoal px-2 py-0.5">
                    <XCircle size={10} />
                    Not connected
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal mt-0.5">
                Push pins and guides into a Notion database as one page per pin.
              </p>
            </div>
          </div>
        </div>

        {!cryptoConfigured && (
          <div className="rounded-lg border border-red-200 bg-red-50/60 text-xs text-red-700 px-3 py-2">
            <strong>Encryption key missing.</strong> Set{" "}
            <code>PINHUB_KEY_ENC_SECRET</code> in Vercel before connecting any
            integration.
          </div>
        )}

        {notion?.connected ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-warm-ivory/50 border border-warm-taupe/30 p-3 text-xs text-charcoal space-y-1">
              <div>
                Token: <code className="text-deep-espresso">{notion.token_hint}</code>
              </div>
              {typeof notion.metadata?.workspace_name === "string" && (
                <div>
                  Workspace:{" "}
                  <strong className="text-deep-espresso">
                    {notion.metadata.workspace_name as string}
                  </strong>
                </div>
              )}
              {notion.last_validated_at && (
                <div>
                  Last validated:{" "}
                  {new Date(notion.last_validated_at).toLocaleString()}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-warm-taupe text-charcoal hover:bg-cream-hover transition-all active:scale-[0.98]"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <>
                  <Loader2 size={12} className="mr-1 animate-spin" />
                  Disconnecting…
                </>
              ) : (
                "Disconnect"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2 text-xs text-charcoal">
              <p>How to connect:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>
                  Open{" "}
                  <a
                    href="https://www.notion.so/profile/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline text-deep-espresso hover:text-charcoal"
                  >
                    Notion Integrations
                    <ExternalLink size={10} />
                  </a>{" "}
                  and click <strong>+ New integration</strong>.
                </li>
                <li>
                  Name it <code>PinHub</code>, pick your workspace, type{" "}
                  <strong>Internal</strong>, save it, and copy the{" "}
                  <strong>Internal Integration Token</strong>.
                </li>
                <li>
                  In Notion, open the database where you want pins to land →
                  three-dot menu → <strong>Add connections</strong> → invite
                  PinHub.
                </li>
                <li>Paste the token below and click <strong>Connect</strong>.</li>
              </ol>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Internal Integration Token
              </Label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="secret_…"
                className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
                autoComplete="off"
              />
              <p className="text-[11px] text-warm-taupe mt-1">
                Encrypted with AES-256-GCM before storage. Only the server can
                decrypt it.
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleConnect}
              disabled={submitting || !token.trim()}
              className="bg-deep-espresso text-warm-ivory hover:bg-deep-espresso/90 rounded-lg transition-all active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 size={12} className="mr-1 animate-spin" />
                  Validating…
                </>
              ) : (
                "Connect to Notion"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
