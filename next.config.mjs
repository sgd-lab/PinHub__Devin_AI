/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force Next.js to transpile these client-side ESM packages so older
  // mobile JS engines (Opera Mobile, some Samsung Internet, in-app webviews)
  // don't choke with "Unexpected token 'export'" after the user signs in.
  // Without this, any package that ships ESM-only `export` syntax breaks the
  // hydration of every route and the user sees a blank white page.
  //
  // `cmdk` (the command palette underlying lib) was the specific package
  // crashing Ctrl+K / the search bar with
  //   Uncaught SyntaxError: Unexpected token 'export'
  //   TypeError: Cannot read properties of undefined (reading 'subscribe')
  // so it's pinned alongside the others.
  transpilePackages: [
    "lucide-react",
    "date-fns",
    "sonner",
    "recharts",
    "papaparse",
    "file-saver",
    "ai",
    "@ai-sdk/openai",
    "zod",
    "zustand",
    "cmdk",
  ],
  // Baseline security headers applied to every response. Kept conservative
  // so the existing Vercel preview embed flow keeps working — if anything
  // breaks, relax one header at a time rather than removing the block.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
