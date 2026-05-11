/**
 * Extract structured pin sections from raw markdown generation output.
 *
 * Generators emit "## Heading" sections (sometimes nested "### Heading"
 * inside a "## Pin N" block). This parser folds them into a normalized
 * shape that the workflow buttons (Feed to Guide / Add to Calendar /
 * Push to Notion / Save to Library) can consume without each call site
 * re-implementing the regex.
 *
 * It is intentionally permissive — partial / streaming output should
 * still produce useful (if incomplete) pins.
 */

export interface ParsedSection {
  header: string;
  body: string;
}

export interface ParsedPin {
  /** 1-based index of the pin in the original output (HERO = 1). */
  index: number;
  /** Short label e.g. "Pin 1 — HERO" if present, otherwise just "Pin N". */
  label: string;
  title: string;
  description: string;
  hook?: string;
  caption?: string;
  visual_prompt_illustrated?: string;
  visual_prompt_photorealistic?: string;
  /** Raw sections that fell under this pin, in original order. */
  sections: ParsedSection[];
}

export interface ParsedGeneration {
  /** The top-level sections of the document (e.g. "Daily Context"). */
  top_level: ParsedSection[];
  /** One entry per pin if the output describes multiple pins, else a
   *  single synthetic entry containing the whole document. */
  pins: ParsedPin[];
  /** True when the parser was able to identify >= 1 pin block. */
  has_explicit_pins: boolean;
}

const PIN_HEADER_RE = /^pin\s*(\d+)\b/i;

function splitSections(input: string): ParsedSection[] {
  if (!input.trim()) return [];
  const blocks = input.split(/(?=^##\s+)/m).filter((b) => b.trim().length > 0);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const header = lines[0].replace(/^#+\s*/, "").trim();
    const body = lines.slice(1).join("\n").trim();
    return { header, body };
  });
}

function splitNestedSections(body: string): ParsedSection[] {
  if (!body.trim()) return [];
  const blocks = body.split(/(?=^###\s+)/m).filter((b) => b.trim().length > 0);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const header = lines[0].replace(/^#+\s*/, "").trim();
    const body = lines.slice(1).join("\n").trim();
    return { header, body };
  });
}

function findSection(
  sections: ParsedSection[],
  needles: string[]
): ParsedSection | undefined {
  return sections.find((s) =>
    needles.some((n) => s.header.toLowerCase().includes(n.toLowerCase()))
  );
}

function buildPin(
  index: number,
  label: string,
  sections: ParsedSection[]
): ParsedPin {
  const title = findSection(sections, ["title"])?.body ?? "";
  const description = findSection(sections, ["description", "caption"])?.body ?? "";
  const hook = findSection(sections, ["hook"])?.body;
  const caption = findSection(sections, ["caption"])?.body;
  const illustrated = findSection(sections, [
    "illustrated",
    "version a",
    "visual prompt (illustrated",
  ])?.body;
  const photoreal = findSection(sections, [
    "photorealistic",
    "version b",
    "visual prompt (photorealistic",
  ])?.body;

  return {
    index,
    label,
    title: title.trim(),
    description: description.trim(),
    hook: hook?.trim(),
    caption: caption?.trim(),
    visual_prompt_illustrated: illustrated?.trim(),
    visual_prompt_photorealistic: photoreal?.trim(),
    sections,
  };
}

/**
 * Parse a generation output into a normalized list of pins. Handles:
 * - Single-pin output ("## SEO Title", "## SEO Description", ...)
 * - 3-pin daily output ("## Pin 1 — HERO" then "### Title", "### Description", ...)
 */
export function parseGenerationOutput(raw: string): ParsedGeneration {
  const sections = splitSections(raw);
  const topLevel: ParsedSection[] = [];
  const pinBlocks: ParsedSection[] = [];

  for (const sec of sections) {
    if (PIN_HEADER_RE.test(sec.header)) {
      pinBlocks.push(sec);
    } else {
      topLevel.push(sec);
    }
  }

  if (pinBlocks.length > 0) {
    const pins = pinBlocks.map((block, i) => {
      const match = block.header.match(PIN_HEADER_RE);
      const declaredIndex = match ? parseInt(match[1], 10) : i + 1;
      const nested = splitNestedSections(block.body);
      return buildPin(declaredIndex, block.header, nested);
    });
    return { top_level: topLevel, pins, has_explicit_pins: true };
  }

  // Single-pin case: treat the top-level sections as one pin.
  if (sections.length > 0) {
    const pin = buildPin(1, sections[0]?.header ?? "Pin 1", sections);
    return { top_level: [], pins: [pin], has_explicit_pins: false };
  }

  return { top_level: [], pins: [], has_explicit_pins: false };
}

/** Render a pin into a compact text representation for clipboard / preview. */
export function renderPinAsText(pin: ParsedPin): string {
  const parts: string[] = [];
  if (pin.title) parts.push(`Title: ${pin.title}`);
  if (pin.description) parts.push(`Description: ${pin.description}`);
  if (pin.hook) parts.push(`Hook: ${pin.hook}`);
  if (pin.visual_prompt_photorealistic)
    parts.push(`Visual (Photorealistic): ${pin.visual_prompt_photorealistic}`);
  if (pin.visual_prompt_illustrated)
    parts.push(`Visual (Illustrated): ${pin.visual_prompt_illustrated}`);
  return parts.join("\n\n");
}
