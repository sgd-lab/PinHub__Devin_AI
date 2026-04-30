"use client";

import { AlertTriangle, Key, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { type AIErrorInfo, getErrorTitle } from "@/lib/ai/aiErrorHandler";

interface AIErrorCardProps {
  error: AIErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const TYPE_STYLES: Record<AIErrorInfo["errorType"], { bg: string; border: string; icon: string }> = {
  auth: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500" },
  rate_limit: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500" },
  quota: { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-500" },
  model: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-500" },
  network: { bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-500" },
  server: { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-500" },
  unknown: { bg: "bg-warm-ivory", border: "border-warm-taupe/30", icon: "text-charcoal" },
};

export function AIErrorCard({ error, onRetry, onDismiss }: AIErrorCardProps) {
  const style = TYPE_STYLES[error.errorType];
  const title = getErrorTitle(error.errorType);

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4 space-y-3`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className={`${style.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-deep-espresso">{title}</h4>
          <p className="text-xs text-charcoal mt-0.5 capitalize">
            Provider: {error.provider}
          </p>
          <p className="text-xs text-charcoal/70 mt-1">{error.message}</p>
          <p className="text-xs text-charcoal mt-2">{error.suggestion}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-8">
        {error.fixPath && (
          <Link href={error.fixPath}>
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5 rounded-lg border-warm-taupe">
              <Key size={12} />
              Fix in Settings
              <ExternalLink size={10} />
            </Button>
          </Link>
        )}
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="text-xs h-7 gap-1.5 rounded-lg border-warm-taupe">
            <RefreshCw size={12} />
            Retry
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss} className="text-xs h-7 text-charcoal">
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
