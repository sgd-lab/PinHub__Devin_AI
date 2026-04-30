import { NextRequest, NextResponse } from "next/server";

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
}

export async function POST(req: NextRequest) {
  try {
    const { query, apiKey } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Missing search query" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Serper API key" }, { status: 400 });
    }

    // Run multiple searches in parallel for comprehensive Pinterest research
    const searches = [
      `${query} Pinterest trends 2025 2026`,
      `${query} Pinterest content ideas`,
      `${query} Pinterest seasonal trends`,
    ];

    const searchPromises = searches.map((q) =>
      fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q,
          num: 8,
        }),
      }).then((r) => r.json())
    );

    const responses = await Promise.all(searchPromises);

    const allResults: SearchResult[] = [];
    const seenLinks = new Set<string>();

    for (const response of responses) {
      if (response.organic) {
        for (const item of response.organic) {
          if (!seenLinks.has(item.link)) {
            seenLinks.add(item.link);
            allResults.push({
              title: item.title || "",
              link: item.link || "",
              snippet: item.snippet || "",
              position: item.position || 0,
            });
          }
        }
      }
    }

    return NextResponse.json({
      results: allResults.slice(0, 20),
      query,
    } satisfies SearchResponse);
  } catch (error) {
    return NextResponse.json(
      { error: `Search failed: ${String(error)}` },
      { status: 500 }
    );
  }
}
