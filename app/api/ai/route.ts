import { NextRequest, NextResponse } from "next/server";
import { validateBaseUrl } from "@/lib/ai/urlValidator";

function buildHeaders(baseUrl: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (baseUrl.includes("api.anthropic.com")) {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  if (baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://pinhub-one.vercel.app";
    headers["X-Title"] = "PinHub Atelier";
  }

  return headers;
}

function buildEndpoint(baseUrl: string): string {
  if (baseUrl.includes("api.anthropic.com")) {
    return `${baseUrl}/messages`;
  }
  return `${baseUrl}/chat/completions`;
}

function buildRequestBody(
  baseUrl: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  max_tokens: number,
  top_p: number,
  stream: boolean
): Record<string, unknown> {
  if (baseUrl.includes("api.anthropic.com")) {
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystemMsgs = messages.filter((m) => m.role !== "system");
    return {
      model,
      system: systemMsg?.content || "",
      messages: nonSystemMsgs,
      temperature,
      max_tokens,
      top_p,
      stream,
    };
  }
  return { model, messages, temperature, max_tokens, top_p, stream };
}

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

    const endpoint = buildEndpoint(baseUrl);
    const headers = buildHeaders(baseUrl, apiKey);
    const reqBody = buildRequestBody(baseUrl, model, messages, temperature, max_tokens, top_p, stream);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(reqBody),
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
