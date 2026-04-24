import type { PromptTemplate } from "@/lib/db/dexie";

export function loadTemplate(template: PromptTemplate, variables: Record<string, string>): string {
  let text = template.prompt_text;

  for (const [key, value] of Object.entries(variables)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }

  return text;
}

export function getTemplateVariables(template: PromptTemplate): string[] {
  const pattern = /\{([^}]+)\}/g;
  const variables: string[] = [];
  let match;
  while ((match = pattern.exec(template.prompt_text)) !== null) {
    variables.push(match[1]);
  }
  return Array.from(new Set(variables));
}

export function validateTemplate(template: PromptTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.name) errors.push("Template name is required");
  if (!template.prompt_text) errors.push("Prompt text is required");
  if (!template.version) errors.push("Version is required");
  if (template.output_schema.length === 0) {
    errors.push("At least one output schema field is required");
  }

  return { valid: errors.length === 0, errors };
}
