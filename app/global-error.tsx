"use client";

/**
 * Catches errors thrown inside the root layout itself (e.g. crashes in
 * AuthProvider, AppShell, providers, fonts, etc.) — anything that
 * `app/error.tsx` cannot wrap because it lives inside the same layout
 * that has thrown. Must render its own <html>/<body> per Next.js docs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "32px",
          textAlign: "center",
          background: "#FBF8F3",
          color: "#3D2C20",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ fontSize: "22px", fontWeight: 600 }}>
          PinHub hit a snag loading.
        </div>
        <p style={{ fontSize: "14px", maxWidth: 420, opacity: 0.75 }}>
          Something crashed before the workspace could render. Refreshing
          usually clears it — if it doesn&rsquo;t, sign out and back in.
        </p>
        {error.digest && (
          <p
            style={{
              fontSize: "10px",
              opacity: 0.5,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            ref: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button
            onClick={() => reset()}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              background: "#3D2C20",
              color: "#FBF8F3",
              border: "none",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/login"
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              background: "#EDE4D6",
              color: "#3D2C20",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            Sign in
          </a>
        </div>
      </body>
    </html>
  );
}
