import type { SpecFile } from "./types.js";

export interface LintFinding {
  specFile: string;
  ruleId: string | null;
  rule: string;
  severity: "warn" | "info";
  category:
    | "rule_too_long"
    | "spec_too_many_rules"
    | "missing_behavior_block"
    | "stale_proposed";
  message: string;
}

export interface LintOptions {
  /** Maximum word count in a rule's description before it's flagged. Default 200. */
  maxDescriptionWords?: number;
  /** Maximum rules in a single spec file before it's flagged for splitting. Default 30. */
  maxRulesPerSpec?: number;
  /** Behavioral surface keywords that should usually carry a behavior block. */
  behavioralKeywords?: string[];
}

const DEFAULT_BEHAVIORAL_KEYWORDS = [
  "endpoint",
  "api",
  "procedure",
  "router",
  "handler",
  "function",
  "callback",
  "webhook",
  "job",
  "trigger",
];

export function lintSpecs(
  specs: SpecFile[],
  options: LintOptions = {}
): LintFinding[] {
  const maxWords = options.maxDescriptionWords ?? 200;
  const maxRules = options.maxRulesPerSpec ?? 30;
  const keywords = (
    options.behavioralKeywords ?? DEFAULT_BEHAVIORAL_KEYWORDS
  ).map((k) => k.toLowerCase());

  const findings: LintFinding[] = [];

  for (const spec of specs) {
    if (spec.rules.length > maxRules) {
      findings.push({
        specFile: spec.filePath,
        ruleId: null,
        rule: "spec_too_many_rules",
        severity: "warn",
        category: "spec_too_many_rules",
        message: `${spec.rules.length} rules in one spec — consider splitting (limit: ${maxRules}).`,
      });
    }

    for (const rule of spec.rules) {
      const wordCount = countWords(rule.description ?? "");
      if (wordCount > maxWords) {
        findings.push({
          specFile: spec.filePath,
          ruleId: rule.id,
          rule: rule.title ?? "(untitled)",
          severity: "warn",
          category: "rule_too_long",
          message: `description is ${wordCount} words (limit: ${maxWords}). Move historical context to \`notes\`, keep \`description\` to a 1–3 sentence summary.`,
        });
      }

      if (
        !rule.behavior &&
        rule.status !== "removed" &&
        looksBehavioral(rule.title ?? "", keywords)
      ) {
        findings.push({
          specFile: spec.filePath,
          ruleId: rule.id,
          rule: rule.title ?? "(untitled)",
          severity: "info",
          category: "missing_behavior_block",
          message: `title suggests a behavioral surface but no \`behavior\` block. Consider adding one (surface, invariants, errors).`,
        });
      }
    }
  }

  return findings;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function looksBehavioral(title: string, keywords: string[]): boolean {
  const lower = title.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}
