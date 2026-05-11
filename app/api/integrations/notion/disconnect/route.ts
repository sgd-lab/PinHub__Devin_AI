import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { disconnectIntegration } from "@/lib/integrations/notionRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const sb = getSupabaseServerClient();
  if (!sb)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await disconnectIntegration(sb, user.id, "notion");
  return NextResponse.json({ ok: true });
}
