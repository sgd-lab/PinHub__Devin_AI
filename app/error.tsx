"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Catches uncaught rendering errors so the
 * user sees a friendly fallback (with a "Reset" button that re-renders
 * the segment) instead of a raw stack trace or a blank "Application
 * error" screen.
 *
 * `global-error.tsx` handles errors that escape this boundary (e.g.
 * crashes in the root layout itself).
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the browser console for the dev / for anyone
    // inspecting in DevTools, but never leak it into the UI.
    // eslint-disable-next-line no-console
    console.error("[RouteError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="font-serif text-2xl text-deep-espresso">
        Something went wrong on this page.
      </div>
      <p className="text-sm text-warm-taupe max-w-md">
        We hit an unexpected error while rendering. You can try again, or
        head back to the dashboard.
      </p>
      {error.digest && (
        <p className="text-[10px] text-warm-taupe/70 font-mono">
          ref: {error.digest}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-md bg-deep-espresso text-warm-ivory text-sm hover:bg-deep-espresso/90 active:scale-95 transition-transform"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-md bg-cream-hover text-deep-espresso text-sm hover:bg-warm-taupe/30 active:scale-95 transition-transform"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
