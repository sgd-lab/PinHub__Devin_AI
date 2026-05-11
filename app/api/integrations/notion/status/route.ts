import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { getIntegrationStatus } from "@/lib/integrations/notionRepository";
import { isCryptoConfigured } from "@/lib/auth/keyCrypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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

  const status = await getIntegrationStatus(sb, user.id, "notion");
  return NextResponse.json({
    crypto_configured: isCryptoConfigured(),
    notion: status,
  });
}
