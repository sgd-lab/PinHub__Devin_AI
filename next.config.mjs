/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force Next.js to transpile these client-side ESM packages so older
  // mobile JS engines (Opera Mobile, some Samsung Internet, in-app webviews)
  // don't choke with "Unexpected token 'export'" after the user signs in.
  // Without this, any package that ships ESM-only `export` syntax breaks the
  // hydration of every route and the user sees a blank white page.
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
  ],
};

export default nextConfig;
