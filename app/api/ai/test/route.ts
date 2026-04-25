import { NextRequest, NextResponse } from "next/server";
import { validateBaseUrl } from "@/lib/ai/urlValidator";

export async function POST(req: NextRequest) {
  try {
    const { baseUrl, apiKey } = await req.json();

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ success: false, error: "Missing baseUrl or apiKey" }, { status: 400 });
    }

    const urlCheck = validateBaseUrl(baseUrl);
    if (!urlCheck.valid) {
      return NextResponse.json({ success: false, error: urlCheck.error }, { status: 403 });
    }

    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      });
    }

    const data = await response.json();
    const models = data.data?.map((m: { id: string }) => m.id) || [];
    return NextResponse.json({ success: true, models });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
