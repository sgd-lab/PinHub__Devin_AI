"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  X,
  Send,
  Square,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  ChevronDown,
  Settings as SettingsIcon,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import {
  PROVIDERS,
  PROVIDER_IDS,
  type ProviderId,
  type ModelInfo,
} from "@/lib/ai/providers/types";
import {
  GenerationErrorBanner,
  type GenerationErrorState,
} from "@/components/ai/GenerationErrorBanner";
import { toast } from "sonner";

interface SessionRow {
  id: string;
  title: string;
  provider: string | null;
  model: string | null;
  last_error_code: string | null;
  created_at: string;
  last_message_at: string;
}

interface MessageRow {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider?: string | null;
  model?: string | null;
  error_code?: string | null;
  created_at?: string;
  /** UI-only: marks streaming reply we're currently building. */
  streaming?: boolean;
}

interface ProviderSettings {
  provider: ProviderId;
  enabled: boolean;
  default_model: string | null;
  available_models: ModelInfo[];
}

export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [genError, setGenError] = useState<GenerationErrorState | null>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [providerSettings, setProviderSettings] = useState<ProviderSettings[]>([]);
  const [hasKeys, setHasKeys] = useState<Set<ProviderId>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ───── load sessions + keys/settings on mount
  const loadSessions = useCallback(async (): Promise<SessionRow[] | undefined> => {
    const r = await fetch("/api/ai/sessions", { cache: "no-store" });
    if (!r.ok) return undefined;
    const j = (await r.json()) as { sessions: SessionRow[] };
    setSessions(j.sessions);
    return j.sessions;
  }, []);

  const loadKeys = useCallback(async () => {
    const r = await fetch("/api/ai/keys", { cache: "no-store" });
    if (!r.ok) return;
    const j = (await r.json()) as {
      keys: Array<{ provider: ProviderId }>;
      settings: ProviderSettings[];
    };
    setProviderSettings(j.settings ?? []);
    setHasKeys(new Set((j.keys ?? []).map((k) => k.provider)));
  }, []);

  const selectSession = useCallback(async (s: SessionRow) => {
    setActiveSession(s);
    setGenError(null);
    setShowSwitcher(false);
    const r = await fetch(`/api/ai/sessions/${s.id}/messages`, {
      cache: "no-store",
    });
    if (!r.ok) {
      setMessages([]);
      return;
    }
    const j = (await r.json()) as { messages: MessageRow[] };
    setMessages(j.messages);
  }, []);

  useEffect(() => {
    void loadKeys();
    void loadSessions().then((sess) => {
      if (sess && sess.length > 0) {
        void selectSession(sess[0]);
      }
    });
  }, [loadKeys, loadSessions, selectSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, streaming]);

  const newSession = async () => {
    const r = await fetch("/api/ai/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New chat" }),
    });
    if (!r.ok) {
      toast.error("Failed to create session");
      return;
    }
    const j = (await r.json()) as { session: SessionRow };
    setSessions((prev) => [j.session, ...prev]);
    void selectSession(j.session);
  };

  const renameSession = async (s: SessionRow) => {
    const next = window.prompt("Rename chat", s.title);
    if (!next || next.trim() === s.title) return;
    const r = await fetch(`/api/ai/sessions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next.trim() }),
    });
    if (!r.ok) {
      toast.error("Failed to rename");
      return;
    }
    setSessions((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, title: next.trim() } : x))
    );
    if (activeSession?.id === s.id) {
      setActiveSession({ ...activeSession, title: next.trim() });
    }
  };

  const deleteSession = async (s: SessionRow) => {
    if (!window.confirm(`Delete "${s.title}"? This can't be undone.`)) return;
    const r = await fetch(`/api/ai/sessions/${s.id}`, { method: "DELETE" });
    if (!r.ok) {
      toast.error("Failed to delete");
      return;
    }
    setSessions((prev) => prev.filter((x) => x.id !== s.id));
    if (activeSession?.id === s.id) {
      setActiveSession(null);
      setMessages([]);
    }
  };

  const clearChat = async () => {
    if (!activeSession) return;
    if (!window.confirm("Clear all messages in this chat?")) return;
    const r = await fetch(`/api/ai/sessions/${activeSession.id}/messages`, {
      method: "DELETE",
    });
    if (!r.ok) {
      toast.error("Failed to clear");
      return;
    }
    setMessages([]);
    setGenError(null);
  };

  const switchSessionProvider = async (
    provider: ProviderId | null,
    model: string | null
  ) => {
    if (!activeSession) return;
    const r = await fetch(`/api/ai/sessions/${activeSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model }),
    });
    if (!r.ok) {
      toast.error("Failed to switch provider");
      return;
    }
    setActiveSession({ ...activeSession, provider, model });
    setSessions((prev) =>
      prev.map((x) =>
        x.id === activeSession.id ? { ...x, provider, model } : x
      )
    );
    setShowSwitcher(false);
  };

  const sendMessage = useCallback(
    async (opts?: { regenerate?: boolean }) => {
      let session = activeSession;
      if (!session) {
        const r = await fetch("/api/ai/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: input.slice(0, 50) || "New chat" }),
        });
        if (!r.ok) {
          toast.error("Failed to create session");
          return;
        }
        const j = (await r.json()) as { session: SessionRow };
        session = j.session;
        setSessions((prev) => [j.session, ...prev]);
        setActiveSession(j.session);
      }

      const content = opts?.regenerate ? "" : input.trim();
      if (!opts?.regenerate && !content) return;

      setGenError(null);
      setStreaming(true);
      abortRef.current = new AbortController();

      if (!opts?.regenerate) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content },
          { role: "assistant", content: "", streaming: true },
        ]);
        setInput("");
      } else {
        setMessages((prev) => {
          let lastUserIdx = -1;
          for (let i = prev.length - 1; i >= 0; i -= 1) {
            if (prev[i].role === "user") {
              lastUserIdx = i;
              break;
            }
          }
          if (lastUserIdx === -1) return prev;
          return [
            ...prev.slice(0, lastUserIdx + 1),
            { role: "assistant", content: "", streaming: true },
          ];
        });
      }

      let assistantBuf = "";
      let resolvedProvider: string | null = null;
      let resolvedModel: string | null = null;
      let errorCode: string | null = null;
      let errorMessage: string | null = null;

      try {
        const res = await fetch(`/api/ai/sessions/${session.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: opts?.regenerate ? undefined : content,
            regenerate: !!opts?.regenerate,
          }),
          signal: abortRef.current.signal,
        });
        if (!res.ok || !res.body) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = await res.json();
            if (j?.error) msg = j.error;
          } catch {
            // ignore
          }
          setGenError({ code: "internal_error", message: msg });
          setStreaming(false);
          setMessages((prev) => prev.filter((m) => !m.streaming));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const event = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const dataLine = event
              .split("\n")
              .find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const payload = dataLine.slice(5).trim();
            if (!payload) continue;
            try {
              const parsed = JSON.parse(payload);
              switch (parsed.type) {
                case "meta":
                  resolvedProvider = parsed.provider;
                  resolvedModel = parsed.model;
                  break;
                case "token":
                  assistantBuf += parsed.token ?? "";
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.streaming ? { ...m, content: assistantBuf } : m
                    )
                  );
                  break;
                case "error":
                  errorCode = parsed.code ?? "provider_error";
                  errorMessage = parsed.message ?? "Provider error";
                  break;
                case "done":
                  break;
              }
            } catch {
              // skip
            }
          }
        }

        if (errorCode && errorMessage) {
          setGenError({ code: errorCode, message: errorMessage });
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.streaming
              ? {
                  ...m,
                  content: assistantBuf,
                  provider: resolvedProvider,
                  model: resolvedModel,
                  error_code: errorCode,
                  streaming: false,
                }
              : m
          )
        );

        void loadSessions();
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.streaming
                ? {
                    ...m,
                    content: assistantBuf || "[stopped]",
                    streaming: false,
                  }
                : m
            )
          );
        } else {
          setGenError({
            code: "internal_error",
            message: e instanceof Error ? e.message : String(e),
          });
          setMessages((prev) => prev.filter((m) => !m.streaming));
        }
      } finally {
        setStreaming(false);
      }
    },
    [activeSession, input, loadSessions]
  );

  const stopStream = () => abortRef.current?.abort();

  const recordMemory = async (
    kind:
      | "accepted_suggestion"
      | "rejected_suggestion"
      | "favorite_style"
      | "creator_goal"
      | "preferred_tone",
    text: string
  ) => {
    await fetch("/api/ai/memory/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        payload: { text: text.slice(0, 200) },
        source_session_id: activeSession?.id,
      }),
    });
    toast.success(
      kind === "accepted_suggestion"
        ? "Saved to memory"
        : kind === "rejected_suggestion"
          ? "Marked as 'not for me'"
          : "Saved"
    );
  };

  const enabledProviders = PROVIDER_IDS.filter((p) => {
    const s = providerSettings.find((x) => x.provider === p);
    return s?.enabled && hasKeys.has(p);
  });

  const sessionProviderLabel =
    activeSession?.provider &&
    (PROVIDER_IDS as string[]).includes(activeSession.provider)
      ? `${
          PROVIDERS[activeSession.provider as ProviderId].label
        } · ${activeSession.model}`
      : "Auto (use your task assignments)";

  return (
    <div
      className="fixed bottom-24 right-6 z-40 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-7rem)] bg-warm-ivory rounded-2xl shadow-2xl border border-warm-taupe/40 flex flex-col overflow-hidden"
      role="dialog"
      aria-label="AI Creative Assistant"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-taupe/30 bg-cream-hover/40">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} className="text-deep-espresso shrink-0" />
          <div className="min-w-0">
            <div className="font-serif text-sm text-deep-espresso truncate">
              {activeSession?.title || "Creative Assistant"}
            </div>
            <button
              onClick={() => setShowSwitcher((v) => !v)}
              className="text-[10px] text-warm-taupe hover:text-deep-espresso flex items-center gap-1 truncate"
            >
              {sessionProviderLabel}
              <ChevronDown size={10} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={newSession}
            title="New chat"
            className="p-1.5 rounded hover:bg-warm-taupe/20"
          >
            <Plus size={14} />
          </button>
          {activeSession && (
            <>
              <button
                onClick={() => renameSession(activeSession)}
                title="Rename"
                className="p-1.5 rounded hover:bg-warm-taupe/20"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={clearChat}
                title="Clear chat"
                className="p-1.5 rounded hover:bg-warm-taupe/20"
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={() => deleteSession(activeSession)}
                title="Delete chat"
                className="p-1.5 rounded hover:bg-red-100 text-red-700"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded hover:bg-warm-taupe/20"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {showSwitcher && (
        <div className="border-b border-warm-taupe/30 bg-warm-ivory p-3 text-xs space-y-2 max-h-56 overflow-y-auto">
          <div className="text-[11px] text-warm-taupe uppercase tracking-wider">
            Provider for this chat
          </div>
          <button
            onClick={() => switchSessionProvider(null, null)}
            className={`w-full text-left px-2 py-1.5 rounded ${
              !activeSession?.provider
                ? "bg-deep-espresso/10 text-deep-espresso"
                : "hover:bg-cream-hover"
            }`}
          >
            <span className="font-medium">Auto</span>
            <span className="text-[10px] text-warm-taupe ml-2">
              use the &quot;chat&quot; task assignment from Settings
            </span>
          </button>
          {enabledProviders.length === 0 && (
            <div className="text-[11px] text-warm-taupe">
              No enabled providers.{" "}
              <Link href="/settings/api-keys" className="underline">
                Add a key →
              </Link>
            </div>
          )}
          {enabledProviders.map((p) => {
            const s = providerSettings.find((x) => x.provider === p);
            const models = s?.available_models ?? [];
            const list =
              models.length > 0
                ? models
                : [
                    {
                      id:
                        s?.default_model ??
                        PROVIDERS[p].fallback_default_model,
                      name:
                        s?.default_model ??
                        PROVIDERS[p].fallback_default_model,
                    },
                  ];
            return (
              <details key={p} className="group">
                <summary className="cursor-pointer list-none px-2 py-1 hover:bg-cream-hover rounded text-[12px] flex items-center justify-between">
                  <span>{PROVIDERS[p].label}</span>
                  <ChevronDown
                    size={10}
                    className="transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="pl-2 max-h-32 overflow-y-auto">
                  {list.map((m) => {
                    const active =
                      activeSession?.provider === p &&
                      activeSession?.model === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => switchSessionProvider(p, m.id)}
                        className={`w-full text-left px-2 py-1 rounded text-[11px] font-mono truncate ${
                          active
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
            className="block text-[10px] text-dusty-rose hover:underline pt-1 border-t border-warm-taupe/30"
          >
            <SettingsIcon size={10} className="inline mr-1" />
            Manage providers
          </Link>
        </div>
      )}

      {!activeSession && sessions.length > 0 && (
        <div className="px-3 pt-3 pb-1 text-[10px] text-warm-taupe uppercase tracking-wider">
          Recent
        </div>
      )}
      {!activeSession && (
        <div className="px-2 pb-2 max-h-32 overflow-y-auto">
          {sessions.slice(0, 6).map((s) => (
            <button
              key={s.id}
              onClick={() => selectSession(s)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-cream-hover text-xs truncate"
            >
              <MessageSquare size={11} className="inline mr-1.5 -mt-0.5" />
              {s.title}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !streaming && (
          <div className="text-center text-warm-taupe text-xs px-4 py-10">
            <Sparkles
              size={20}
              className="mx-auto mb-2 text-deep-espresso/60"
            />
            <p className="font-serif text-sm text-deep-espresso mb-1">
              Your creative strategist
            </p>
            <p>
              Ask for pin concepts, hook lines, weekly direction, or feedback
              on recent runs. I know your niches, palette, voice, and what you
              accepted before.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id ?? i}
            message={m}
            onAccept={() => recordMemory("accepted_suggestion", m.content)}
            onReject={() => recordMemory("rejected_suggestion", m.content)}
          />
        ))}
        {genError && (
          <GenerationErrorBanner
            error={genError}
            onRetry={() => {
              setGenError(null);
              void sendMessage({ regenerate: true });
            }}
            onDismiss={() => setGenError(null)}
          />
        )}
      </div>

      <div className="border-t border-warm-taupe/30 p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!streaming) void sendMessage();
              }
            }}
            placeholder="Ask your creative strategist…"
            rows={2}
            className="flex-1 resize-none bg-white/80 border border-warm-taupe/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-deep-espresso/50"
          />
          {streaming ? (
            <button
              onClick={stopStream}
              className="p-2 rounded-lg bg-red-700 text-white hover:bg-red-800"
              title="Stop"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-deep-espresso text-warm-ivory hover:bg-deep-espresso/90 disabled:opacity-40"
              title="Send"
            >
              <Send size={14} />
            </button>
          )}
        </div>
        {messages.some((m) => m.role === "assistant" && !m.streaming) && (
          <div className="flex items-center justify-end gap-2 mt-1.5">
            <button
              onClick={() => void sendMessage({ regenerate: true })}
              disabled={streaming}
              className="text-[10px] text-warm-taupe hover:text-deep-espresso flex items-center gap-1 disabled:opacity-40"
            >
              <RefreshCw size={10} /> Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onAccept,
  onReject,
}: {
  message: MessageRow;
  onAccept: () => void;
  onReject: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-deep-espresso text-warm-ivory rounded-lg rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }
  if (message.role === "system") return null;
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%]">
        <div className="bg-white/70 border border-warm-taupe/30 rounded-lg rounded-bl-sm px-3 py-2 text-sm whitespace-pre-wrap break-words text-charcoal">
          {message.content || (message.streaming ? "…" : "")}
          {message.error_code && (
            <div className="mt-1.5 text-[10px] text-red-700 font-mono">
              [{message.error_code}]
            </div>
          )}
        </div>
        {!message.streaming && message.content && (
          <div className="flex items-center gap-2 mt-1 text-[10px] text-warm-taupe">
            {message.provider && message.model && (
              <span className="truncate">
                {message.provider} · {message.model}
              </span>
            )}
            <button
              onClick={onAccept}
              title="Save as accepted suggestion"
              className="ml-auto p-1 rounded hover:bg-cream-hover"
            >
              <ThumbsUp size={11} />
            </button>
            <button
              onClick={onReject}
              title="Mark as not for me"
              className="p-1 rounded hover:bg-cream-hover"
            >
              <ThumbsDown size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
