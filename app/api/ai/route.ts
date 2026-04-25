import { NextRequest, NextResponse } from "next/server";
import { validateBaseUrl } from "@/lib/ai/urlValidator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseUrl, apiKey, model, messages, temperature, max_tokens, top_p, stream } = body;

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ error: "Missing baseUrl or apiKey" }, { status: 400 });
    }

    const urlCheck = validateBaseUrl(baseUrl);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: urlCheck.error }, { status: 403 });
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens, top_p, stream }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `API Error ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    if (stream) {
      const readable = response.body;
      if (!readable) {
        return NextResponse.json({ error: "No response body" }, { status: 500 });
      }
      return new NextResponse(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
