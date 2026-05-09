"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, Settings as SettingsIcon, X } from "lucide-react";

export interface GenerationErrorState {
  code: string;
  message: string;
}

const FRIENDLY: Record<string, { title: string; hint: string; cta?: "settings" | "retry" }> = {
  invalid_key: {
    title: "API key was rejected",
    hint: "Re-test or replace the key for this provider.",
    cta: "settings",
  },
  expired_key: {
    title: "API key expired",
    hint: "Replace the key in Settings.",
    cta: "settings",
  },
  unsupported_model: {
    title: "Model not available on this provider",
    hint: "Pick a different model in Settings or in the badge above.",
    cta: "settings",
  },
  rate_limit: {
    title: "Provider is rate-limiting",
    hint: "Try again in a moment, or switch provider.",
    cta: "retry",
  },
  timeout: {
    title: "Provider timed out",
    hint: "Retrying may help; or switch provider for the next run.",
    cta: "retry",
  },
  network_error: {
    title: "Couldn't reach the provider",
    hint: "Check your connection and retry.",
    cta: "retry",
  },
  provider_error: {
    title: "Provider returned an error",
    hint: "See the details below; try a different model if it's a model-specific issue.",
    cta: "retry",
  },
  no_provider: {
    title: "No AI provider configured",
    hint: "Add a key and set a task assignment in Settings.",
    cta: "settings",
  },
  internal_error: {
    title: "Something went wrong",
    hint: "Retry, or check the server logs.",
    cta: "retry",
  },
};

export function GenerationErrorBanner({
  error,
  onRetry,
  onDismiss,
}: {
  error: GenerationErrorState;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const f = FRIENDLY[error.code] ?? FRIENDLY.internal_error;
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-xs text-red-900">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium mb-0.5">{f.title}</div>
          <div className="text-[11px] mb-1">{f.hint}</div>
          <div className="font-mono text-[10px] text-red-800/80 break-words whitespace-pre-wrap max-h-24 overflow-y-auto">
            [{error.code}] {error.message}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {f.cta === "settings" && (
              <Link
                href="/settings/api-keys"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-900 text-red-50 text-[11px] hover:bg-red-800"
              >
                <SettingsIcon size={11} /> Open Settings
              </Link>
            )}
            {f.cta === "retry" && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-900 text-red-50 text-[11px] hover:bg-red-800"
              >
                <RefreshCw size={11} /> Retry
              </button>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-0.5 rounded hover:bg-red-100 shrink-0"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
