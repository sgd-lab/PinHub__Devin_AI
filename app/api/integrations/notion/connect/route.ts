import { NextRequest, NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { saveIntegrationToken } from "@/lib/integrations/notionRepository";
import { isCryptoConfigured } from "@/lib/auth/keyCrypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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

  if (!isCryptoConfigured()) {
    return NextResponse.json(
      {
        error:
          "PINHUB_KEY_ENC_SECRET is not configured on the server. Cannot encrypt integration tokens.",
      },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    token?: string;
  } | null;

  if (!body || typeof body.token !== "string") {
    return NextResponse.json(
      { error: "Body must be { token: string }." },
      { status: 400 }
    );
  }

  const token = body.token.trim();
  if (token.length < 10) {
    return NextResponse.json({ error: "Token looks too short." }, { status: 400 });
  }

  // Validate the token actually works with Notion before storing.
  let workspace: { name: string | null; id: string | null } = {
    name: null,
    id: null,
  };
  try {
    const notion = new NotionClient({ auth: token });
    const me = await notion.users.me({});
    workspace = {
      name: me?.name ?? null,
      id: me?.id ?? null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Notion rejected the token: ${msg}` },
      { status: 400 }
    );
  }

  const result = await saveIntegrationToken(sb, user.id, "notion", token, {
    workspace_name: workspace.name,
    workspace_owner_id: workspace.id,
    connected_via: "internal_integration_token",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    hint: result.hint,
    workspace_name: workspace.name,
  });
}
