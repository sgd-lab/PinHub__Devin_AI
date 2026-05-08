"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/db/supabase";
import { toast } from "sonner";

function LoginContent() {
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";
  const [signingIn, setSigningIn] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
  }, []);

  const handleGoogleSignIn = async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      toast.error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setSigningIn(true);
    const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`;
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });

    if (error) {
      toast.error(`Google sign-in failed: ${error.message}`);
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-ivory flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/60 border border-warm-taupe/30 rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-deep-espresso rounded-lg flex items-center justify-center">
            <span className="text-warm-ivory font-serif text-lg font-bold">P</span>
          </div>
          <span className="font-serif text-xl font-semibold text-deep-espresso italic">
            PinHub
          </span>
        </div>

        <div>
          <h1 className="font-serif text-3xl text-deep-espresso italic mb-2">
            Welcome back
          </h1>
          <p className="text-charcoal text-sm leading-relaxed">
            Sign in to access your brand memory, niches, and Prompt Studio.
          </p>
        </div>

        {!configured ? (
          <div className="bg-muted-gold/10 border border-muted-gold/30 rounded-lg p-4 text-sm text-charcoal">
            <p className="font-medium text-deep-espresso mb-1">
              <Sparkles className="inline mr-1" size={14} />
              Supabase not configured
            </p>
            <p>
              Set <code className="bg-warm-ivory/60 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and{" "}
              <code className="bg-warm-ivory/60 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
              in Vercel, then redeploy.
            </p>
          </div>
        ) : (
          <Button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full bg-deep-espresso text-warm-ivory rounded-lg py-3 font-medium"
          >
            {signingIn ? (
              "Redirecting…"
            ) : (
              <span className="flex items-center justify-center gap-2">
                <GoogleIcon /> Continue with Google
              </span>
            )}
          </Button>
        )}

        <div className="text-[11px] text-warm-taupe text-center pt-2">
          The Parisian Atelier · Privacy-first
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M44.5 20H24v8.5h11.8C34.7 33 30 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c11 0 19.5-8 19.5-19.5 0-1.4-.1-2.7-.5-4z"
        fill="#FFC107"
      />
      <path
        d="M6.3 14.7l6.6 4.8C14.7 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5c-7.5 0-13.9 4.2-17.7 10.2z"
        fill="#FF3D00"
      />
      <path
        d="M24 43.5c5.1 0 9.7-2 13.2-5.2l-6.1-5c-2 1.4-4.5 2.2-7.1 2.2-5.9 0-11-3.9-12.7-9.4l-6.5 5C8.4 38.7 15.6 43.5 24 43.5z"
        fill="#4CAF50"
      />
      <path
        d="M44.5 20H24v8.5h11.8c-.8 2.3-2.4 4.3-4.5 5.6l6.1 5c4.3-4 6.6-9.9 6.6-15.6 0-1.4-.1-2.7-.5-3.5z"
        fill="#1976D2"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-warm-ivory flex items-center justify-center text-charcoal">
          Loading…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
