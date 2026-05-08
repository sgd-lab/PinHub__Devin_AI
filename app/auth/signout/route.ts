import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export async function POST(request: Request) {
  const sb = getSupabaseServerClient();
  if (sb) await sb.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
