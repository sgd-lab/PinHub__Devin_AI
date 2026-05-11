import { NextRequest, NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { getDecryptedToken } from "@/lib/integrations/notionRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IncomingPin {
  title: string;
  description?: string | null;
  hook?: string | null;
  caption?: string | null;
  visual_prompt_photorealistic?: string | null;
  visual_prompt_illustrated?: string | null;
  run_id?: string | null;
  run_type?: string | null;
  pin_index?: number | null;
}

function richText(text: string) {
  return [{ type: "text" as const, text: { content: text.slice(0, 1900) } }];
}

type NotionBlock = Record<string, unknown>;

function paragraph(text: string): NotionBlock {
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: richText(text) },
  };
}

function heading(text: string): NotionBlock {
  return {
    object: "block",
    type: "heading_3",
    heading_3: { rich_text: richText(text) },
  };
}

function buildPageProperties(pin: IncomingPin): Record<string, unknown> {
  const title = (pin.title || "Untitled pin").slice(0, 200);
  return {
    Name: {
      title: [{ type: "text", text: { content: title } }],
    },
  };
}

function buildPageChildren(pin: IncomingPin): NotionBlock[] {
  const blocks: NotionBlock[] = [];
  if (pin.hook) {
    blocks.push(heading("Hook"));
    blocks.push(paragraph(pin.hook));
  }
  if (pin.description) {
    blocks.push(heading("Description"));
    blocks.push(paragraph(pin.description));
  }
  if (pin.caption) {
    blocks.push(heading("Caption"));
    blocks.push(paragraph(pin.caption));
  }
  if (pin.visual_prompt_photorealistic) {
    blocks.push(heading("Visual prompt (photorealistic)"));
    blocks.push(paragraph(pin.visual_prompt_photorealistic));
  }
  if (pin.visual_prompt_illustrated) {
    blocks.push(heading("Visual prompt (illustrated)"));
    blocks.push(paragraph(pin.visual_prompt_illustrated));
  }
  if (pin.run_id || pin.run_type) {
    blocks.push(heading("Source"));
    blocks.push(
      paragraph(
        `PinHub run ${pin.run_id ?? "(none)"} — type ${pin.run_type ?? "(unknown)"}`
      )
    );
  }
  return blocks;
}

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

  const body = (await req.json().catch(() => null)) as {
    database_id?: string;
    pins?: IncomingPin[];
  } | null;

  if (!body || typeof body.database_id !== "string" || !Array.isArray(body.pins)) {
    return NextResponse.json(
      { error: "Body must be { database_id, pins: [...] }." },
      { status: 400 }
    );
  }
  if (body.pins.length === 0) {
    return NextResponse.json({ error: "No pins provided." }, { status: 400 });
  }
  if (body.pins.length > 50) {
    return NextResponse.json(
      { error: "Cannot push more than 50 pins at once." },
      { status: 400 }
    );
  }

  const token = await getDecryptedToken(sb, user.id, "notion");
  if (!token) {
    return NextResponse.json(
      { error: "Notion is not connected." },
      { status: 400 }
    );
  }
  const notion = new NotionClient({ auth: token });

  // Verify the database is accessible and discover its title property.
  let titlePropertyName = "Name";
  try {
    const db = await notion.databases.retrieve({ database_id: body.database_id });
    const props = (db as { properties?: Record<string, { type?: string }> })
      .properties;
    if (props) {
      const titleProp = Object.entries(props).find(
        ([, v]) => v && v.type === "title"
      );
      if (titleProp) titlePropertyName = titleProp[0];
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Cannot access database: ${msg}` },
      { status: 400 }
    );
  }

  const results: Array<{
    ok: boolean;
    pin_index: number | null;
    title: string;
    page_id?: string;
    url?: string;
    error?: string;
  }> = [];

  for (const pin of body.pins) {
    try {
      const props = buildPageProperties(pin);
      // Replace "Name" with the database's actual title property.
      if (titlePropertyName !== "Name") {
        props[titlePropertyName] = props.Name;
        delete props.Name;
      }
      const page = (await notion.pages.create({
        parent: { database_id: body.database_id },
        properties: props as never,
        children: buildPageChildren(pin) as never,
      })) as { id?: string; url?: string };
      results.push({
        ok: true,
        pin_index: pin.pin_index ?? null,
        title: pin.title,
        page_id: page.id,
        url: page.url,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({
        ok: false,
        pin_index: pin.pin_index ?? null,
        title: pin.title,
        error: msg,
      });
    }
  }

  const successCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: successCount > 0,
    pushed: successCount,
    total: results.length,
    results,
  });
}
