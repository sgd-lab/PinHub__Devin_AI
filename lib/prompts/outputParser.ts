export interface OutputSchemaField {
  key: string;
  label: string;
  extraction_regex?: string;
  required: boolean;
}

export function parseOutput(
  rawResponse: string,
  schema: OutputSchemaField[]
): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};

  for (const field of schema) {
    if (field.extraction_regex) {
      const regex = new RegExp(field.extraction_regex, "is");
      const match = rawResponse.match(regex);
      if (match) {
        parsed[field.key] = match[1]?.trim() || match[0]?.trim();
      }
    }
  }

  // Fallback: section-based parsing using markdown headers
  const sections = parseSections(rawResponse);

  for (const field of schema) {
    if (!parsed[field.key]) {
      // Try to match by field label or key in section headers
      const sectionKey = Object.keys(sections).find(
        (k) =>
          k.toLowerCase().includes(field.key.toLowerCase()) ||
          k.toLowerCase().includes(field.label.toLowerCase())
      );
      if (sectionKey) {
        parsed[field.key] = sections[sectionKey];
      }
    }
  }

  // Extract hashtags if present
  if (!parsed.hashtags) {
    const hashtagMatch = rawResponse.match(/#\w+/g);
    if (hashtagMatch) {
      parsed.hashtags = hashtagMatch;
    }
  }

  // Extract title if not found via schema
  if (!parsed.title) {
    const titleMatch = rawResponse.match(
      /(?:title|pin title|seo title)[:\s]*(.+?)(?:\n|$)/i
    );
    if (titleMatch) {
      parsed.title = titleMatch[1].trim();
    }
  }

  // Extract description
  if (!parsed.description) {
    const descMatch = rawResponse.match(
      /(?:description|pin description|seo description)[:\s]*(.+?)(?:\n\n|$)/i
    );
    if (descMatch) {
      parsed.description = descMatch[1].trim();
    }
  }

  return parsed;
}

function parseSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split("\n");
  let currentSection = "intro";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headerMatch) {
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join("\n").trim();
      }
      currentSection = headerMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join("\n").trim();
  }

  return sections;
}
