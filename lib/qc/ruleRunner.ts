import type { QCRule } from "./ruleDefinitions";
import type { BrandProfile } from "@/lib/brands/brandSchema";

interface QCResult {
  score: number;
  rules: Array<{ id: string; status: "pass" | "warn" | "fail"; message?: string }>;
}

export function runQCRules(
  parsedFields: Record<string, unknown>,
  rules: Array<{
    rule_type: string;
    target_field: string;
    params: Record<string, unknown>;
    severity: string;
    message: string;
    fix_hint?: string;
    id?: string;
  }>,
  brand: BrandProfile
): QCResult {
  const results: QCResult["rules"] = [];

  for (const rule of rules) {
    const fieldValue = getFieldValue(parsedFields, rule.target_field);
    const resolved = resolveRuleParams(rule.params, brand);
    const passed = evaluateRule(rule.rule_type, fieldValue, resolved);

    results.push({
      id: rule.id || `${rule.rule_type}-${rule.target_field}`,
      status: passed ? "pass" : rule.severity === "hard_fail" ? "fail" : "warn",
      message: passed ? undefined : rule.message,
    });
  }

  const totalRules = results.length;
  const passed = results.filter((r) => r.status === "pass").length;
  const score = totalRules > 0 ? Math.round((passed / totalRules) * 10) : 10;

  return { score, rules: results };
}

function getFieldValue(
  fields: Record<string, unknown>,
  target: string
): string {
  const value = fields[target];
  if (Array.isArray(value)) return value.join(" ");
  return String(value || "");
}

function resolveRuleParams(
  params: Record<string, unknown>,
  brand: BrandProfile
): Record<string, unknown> {
  const resolved = { ...params };

  if (typeof params.values_ref === "string") {
    const ref = params.values_ref;
    if (ref === "niche.keywords") {
      resolved.values = brand.niches.flatMap((n) => n.keywords);
    } else if (ref === "brand.forbidden") {
      resolved.values = brand.visual_system.never;
    } else if (ref === "brand.signature_openers") {
      resolved.values = brand.voice.signature_openers;
    } else if (ref === "brand.power_words") {
      resolved.values = brand.voice.power_words;
    } else if (ref === "brand.palette_names") {
      resolved.values = brand.visual_system.palette.map((p) => p.name);
    }
  }

  return resolved;
}

function evaluateRule(
  ruleType: string,
  fieldValue: string,
  params: Record<string, unknown>
): boolean {
  switch (ruleType) {
    case "char_max":
      return fieldValue.length <= (params.max as number);
    case "char_min":
      return fieldValue.length >= (params.min as number);
    case "contains_any": {
      const values = (params.values as string[]) || [];
      return values.some((v) =>
        fieldValue.toLowerCase().includes(v.toLowerCase())
      );
    }
    case "contains_all": {
      const values = (params.values as string[]) || [];
      return values.every((v) =>
        fieldValue.toLowerCase().includes(v.toLowerCase())
      );
    }
    case "contains_none": {
      const values = (params.values as string[]) || [];
      return !values.some((v) =>
        fieldValue.toLowerCase().includes(v.toLowerCase())
      );
    }
    case "regex": {
      const pattern = params.pattern as string;
      const negate = params.negate as boolean;
      const regex = new RegExp(pattern, "i");
      const matches = regex.test(fieldValue);
      return negate ? !matches : matches;
    }
    case "word_count_range": {
      const words = fieldValue
        .split(/[\s,]+/)
        .filter((w) => w.length > 0).length;
      const min = (params.min as number) || 0;
      const max = (params.max as number) || Infinity;
      return words >= min && words <= max;
    }
    default:
      return true;
  }
}

export function getQCScoreBadgeColor(score: number): string {
  if (score >= 8) return "text-soft-sage";
  if (score >= 5) return "text-muted-gold";
  return "text-red-500";
}

export function generateFixHint(
  rule: QCRule,
  fieldValue: string
): string {
  switch (rule.rule_type) {
    case "char_max":
      return `${fieldValue.length} chars — remove ${fieldValue.length - (rule.params.max as number)} chars`;
    case "contains_none":
      return "Remove forbidden words from content";
    default:
      return rule.fix_hint || "Review and adjust content";
  }
}
