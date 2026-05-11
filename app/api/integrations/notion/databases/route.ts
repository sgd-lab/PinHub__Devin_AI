import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { getDecryptedToken } from "@/lib/integrations/notionRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DatabaseSummary {
  id: string;
  title: string;
  icon: string | null;
  url: string | null;
}

function extractTitle(db: { title?: Array<{ plain_text?: string }> } | unknown): string {
  if (!db || typeof db !== "object") return "Untitled database";
  const maybe = db as { title?: Array<{ plain_text?: string }> };
  if (!Array.isArray(maybe.title)) return "Untitled database";
  return maybe.title.map((t) => t.plain_text ?? "").join("") || "Untitled database";
}

function extractIcon(db: unknown): string | null {
  if (!db || typeof db !== "object") return null;
  const maybe = db as { icon?: { emoji?: string } | null };
  return maybe.icon && typeof maybe.icon === "object" && "emoji" in maybe.icon
    ? (maybe.icon.emoji ?? null)
    : null;
}

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

  const token = await getDecryptedToken(sb, user.id, "notion");
  if (!token) {
    return NextResponse.json(
      { error: "Notion is not connected." },
      { status: 400 }
    );
  }

  const notion = new NotionClient({ auth: token });
  const databases: DatabaseSummary[] = [];

  try {
    let cursor: string | undefined = undefined;
    do {
      // Note: @notionhq/client v5 typed `filter.value` as
      // `"page" | "data_source"`, but the Notion REST API still accepts
      // "database" for legacy compatibility. We search without a filter
      // and discriminate client-side to keep the call typesafe.
      const res = await notion.search({
        page_size: 50,
        start_cursor: cursor,
      });
      for (const obj of res.results) {
        const objType = (obj as { object?: string }).object;
        if (objType !== "database") continue;
        const id = (obj as { id?: string }).id;
        const url = (obj as { url?: string }).url ?? null;
        if (!id) continue;
        databases.push({
          id,
          title: extractTitle(obj),
          icon: extractIcon(obj),
          url,
        });
      }
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor && databases.length < 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Notion search failed: ${msg}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ databases });
}
