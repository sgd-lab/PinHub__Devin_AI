import { NextRequest, NextResponse } from "next/server";
import { validateBaseUrl } from "@/lib/ai/urlValidator";

function buildTestHeaders(baseUrl: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (baseUrl.includes("api.anthropic.com")) {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (baseUrl.includes("api.cohere.com")) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return headers;
}

export async function POST(req: NextRequest) {
  try {
    const { baseUrl, apiKey, provider } = await req.json();

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ success: false, error: "Missing baseUrl or apiKey" }, { status: 400 });
    }

    const urlCheck = validateBaseUrl(baseUrl);
    if (!urlCheck.valid) {
      return NextResponse.json({ success: false, error: urlCheck.error }, { status: 403 });
    }

    const headers = buildTestHeaders(baseUrl, apiKey);

    // Anthropic: no /models endpoint — do a lightweight completion test
    if (baseUrl.includes("api.anthropic.com")) {
      const response = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 5,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({
          success: false,
          error: `This is not a valid Claude API key. HTTP ${response.status}: ${errorText}`,
        });
      }
      return NextResponse.json({
        success: true,
        provider: "anthropic",
        models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
      });
    }

    // Cohere: use /models endpoint with Bearer token
    if (baseUrl.includes("api.cohere.com")) {
      const response = await fetch("https://api.cohere.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({
          success: false,
          error: `This is not a valid Cohere API key. HTTP ${response.status}: ${errorText}`,
        });
      }
      const data = await response.json();
      const models = data.models
        ?.filter((m: { endpoints?: string[] }) => m.endpoints?.includes("chat"))
        ?.map((m: { name: string }) => m.name) || [];
      return NextResponse.json({ success: true, provider: "cohere", models });
    }

    // All other providers: OpenAI-compatible /models endpoint
    const response = await fetch(`${baseUrl}/models`, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      const providerName = provider || "this provider";
      return NextResponse.json({
        success: false,
        error: `This is not a valid ${providerName} API key. HTTP ${response.status}: ${errorText}`,
      });
    }

    const data = await response.json();
    const models = data.data?.map((m: { id: string }) => m.id) || [];
    return NextResponse.json({ success: true, provider: provider || "unknown", models });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
