import { db, type PromptTemplate, type PromptVersionSnapshot } from "./dexie";

export async function getAllPrompts(): Promise<PromptTemplate[]> {
  return db.prompts.toArray();
}

export async function getPromptById(
  id: string
): Promise<PromptTemplate | undefined> {
  return db.prompts.get(id);
}

export async function savePrompt(prompt: PromptTemplate): Promise<void> {
  await db.prompts.put(prompt);
  const snapshot: PromptVersionSnapshot = {
    id: crypto.randomUUID(),
    prompt_id: prompt.id,
    snapshot: prompt as unknown as Record<string, unknown>,
    created_at: new Date().toISOString(),
  };
  await db.promptVersions.add(snapshot);
}

export async function deletePrompt(id: string): Promise<void> {
  await db.prompts.delete(id);
}

export async function getPromptVersions(
  promptId: string
): Promise<PromptVersionSnapshot[]> {
  return db.promptVersions
    .where("prompt_id")
    .equals(promptId)
    .reverse()
    .sortBy("created_at");
}

export async function getPromptsByGenerator(
  generator: "single" | "daily" | "guide" | "custom"
): Promise<PromptTemplate[]> {
  const all = await db.prompts.toArray();
  return all.filter((p) => p.compatible_generators.includes(generator));
}
