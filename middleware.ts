import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/generate",
  "/library",
  "/calendar",
  "/brands",
  "/prompts",
  "/analytics",
  "/research-enhancer",
  "/export",
  "/automation",
  "/settings",
  "/onboarding",
];

const AUTH_PATHS = ["/login"];

function pathMatches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public files / Next internals — let through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured (e.g. preview without env), don't gate routes —
  // the UI will surface a "Set up Supabase" message instead.
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = pathMatches(pathname, PROTECTED_PREFIXES);
  const isAuthPath = pathMatches(pathname, AUTH_PATHS);

  // Not signed in → push to /login when accessing protected routes
  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signed in but visiting /login → bounce to dashboard or onboarding
  if (user && isAuthPath) {
    const dashboard = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboard);
  }

  // Signed in but onboarding incomplete → force onboarding
  if (user && isProtected && pathname !== "/onboarding") {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.onboarding_completed) {
      const onboardingUrl = new URL("/onboarding", request.url);
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match everything except static assets
    "/((?!_next/static|_next/image|favicon.ico|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
