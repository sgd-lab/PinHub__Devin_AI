export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  context_length?: number;
}

const modelCache: Map<string, { models: ModelInfo[]; fetched_at: number }> = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export async function getModelsForProvider(
  baseUrl: string,
  apiKey: string,
  providerName: string
): Promise<ModelInfo[]> {
  const cached = modelCache.get(providerName);
  if (cached && Date.now() - cached.fetched_at < CACHE_TTL) {
    return cached.models;
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const models: ModelInfo[] = (data.data || []).map(
      (m: Record<string, unknown>) => ({
        id: m.id as string,
        name: (m.name as string) || (m.id as string),
        provider: providerName,
        capabilities: inferCapabilities(m),
        context_length: m.context_length as number | undefined,
      })
    );

    modelCache.set(providerName, { models, fetched_at: Date.now() });
    return models;
  } catch {
    return [];
  }
}

function inferCapabilities(model: Record<string, unknown>): string[] {
  const caps: string[] = [];
  const id = ((model.id as string) || "").toLowerCase();

  if (id.includes("vision") || id.includes("4o")) caps.push("vision");
  if (
    (model.context_length as number) > 32000 ||
    id.includes("128k") ||
    id.includes("long")
  )
    caps.push("long-context");
  if (id.includes("turbo") || id.includes("fast") || id.includes("groq"))
    caps.push("fast");
  if (id.includes("mini") || id.includes("haiku")) caps.push("cheap");
  if (id.includes("o1") || id.includes("reasoning")) caps.push("reasoning");

  return caps;
}

export function clearModelCache(provider?: string): void {
  if (provider) {
    modelCache.delete(provider);
  } else {
    modelCache.clear();
  }
}
