import type { BrandProfile } from "@/lib/brands/brandSchema";

export function resolveVariables(
  template: string,
  brand: BrandProfile,
  runtimeInputs: Record<string, string>
): { resolved: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const variablePattern = /\{([^}]+)\}/g;

  const context: Record<string, unknown> = {
    brand: brand,
    "brand.name": brand.identity.name,
    "brand.tagline": brand.identity.tagline,
    "brand.mission": brand.identity.mission_statement,
    "brand.operator": brand.identity.operator_name,
    "model.description": buildModelDescription(brand),
    "model.hair": brand.model_persona.hair,
    "model.eyes": brand.model_persona.eyes,
    "model.skin": brand.model_persona.skin,
    "model.accessories": brand.model_persona.accessories.join(", "),
    "model.nano_banana": brand.model_persona.nano_banana_face_reference,
    "today.date": new Date().toISOString().split("T")[0],
    "today.day": new Date().toLocaleDateString("en-US", { weekday: "long" }),
    ...runtimeInputs,
  };

  // Add niche-level variables
  const activeNiche = runtimeInputs.niche
    ? brand.niches.find(
        (n) =>
          n.name.toLowerCase().includes(runtimeInputs.niche.toLowerCase()) ||
          n.id === runtimeInputs.niche
      )
    : brand.niches[0];

  if (activeNiche) {
    context["niche.name"] = activeNiche.name;
    context["niche.hook"] = activeNiche.hook;
    context["niche.keywords"] = activeNiche.keywords.join(", ");
    context["niche.hero_pieces"] = activeNiche.hero_pieces.join(", ");
    context["niche.color_story"] = activeNiche.color_story.join(", ");
    context["niche.forbidden"] = activeNiche.forbidden.join(", ");
    context["niche.audience"] = activeNiche.audience;
    context["niche.emotional_targets"] = activeNiche.emotional_targets.join(", ");
  }

  // Add palette variables
  context["palette.names"] = brand.visual_system.palette
    .map((p) => p.name)
    .join(", ");
  context["palette.hexes"] = brand.visual_system.palette
    .map((p) => p.hex)
    .join(", ");
  context["voice.signature_openers"] = brand.voice.signature_openers.join(" | ");
  context["voice.power_words"] = brand.voice.power_words.join(", ");
  context["seo.hashtags"] = brand.pinterest.default_hashtags.join(" ");

  const resolved = template.replace(variablePattern, (match, path: string) => {
    const value = resolvePath(context, path.trim());
    if (value === undefined || value === null) {
      unresolved.push(path.trim());
      return match;
    }
    return String(value);
  });

  return { resolved, unresolved };
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  // Direct lookup first
  if (path in obj) return obj[path];

  // Dot-notation traversal
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function buildModelDescription(brand: BrandProfile): string {
  const p = brand.model_persona;
  return `${p.hair}, ${p.eyes} eyes, ${p.skin} skin, ${p.height_build}, ${p.distinguishing}. Wearing ${p.accessories.join(", ")}.`;
}

export function extractVariables(template: string): string[] {
  const pattern = /\{([^}]+)\}/g;
  const variables: string[] = [];
  let match;
  while ((match = pattern.exec(template)) !== null) {
    variables.push(match[1].trim());
  }
  return Array.from(new Set(variables));
}
