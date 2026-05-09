import { readFileSync } from "fs";
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
    | "stale_proposed"
    | "forbidden_pattern_in_description"
    | "spec_file_too_large";
  message: string;
}

export interface LintOptions {
  /** Maximum word count in a rule's description before it's flagged. Default 100 (in upcoming change). */
  maxDescriptionWords?: number;
  /** Maximum rules in a single spec file before it's flagged for splitting. Default 30. */
  maxRulesPerSpec?: number;
  /** Maximum on-disk line count for a spec file before it's flagged. Default 800. Set 0 to disable. */
  maxSpecFileLines?: number;
  /** Regex strings checked against rule descriptions. Default flags ticket/PR/phase references. Set [] to disable. */
  forbiddenPatterns?: string[];
  /** Behavioral surface keywords that should usually carry a behavior block. */
  behavioralKeywords?: string[];
  /** Test injection: bypass on-disk reads with explicit per-file line counts. Production omits. */
  fileLineCounts?: Map<string, number>;
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

const DEFAULT_FORBIDDEN_PATTERNS = ["#\\d+", "TKT-\\d+", "Phase \\d+\\b"];

function getLineCount(
  spec: SpecFile,
  override?: Map<string, number>
): number {
  if (override?.has(spec.filePath)) {
    return override.get(spec.filePath)!;
  }
  try {
    const text = readFileSync(spec.filePath, "utf8");
    if (text.length === 0) return 0;
    const lines = text.split("\n").length;
    return text.endsWith("\n") ? lines - 1 : lines;
  } catch {
    return 0;
  }
}

export function lintSpecs(
  specs: SpecFile[],
  options: LintOptions = {}
): LintFinding[] {
  const maxWords = options.maxDescriptionWords ?? 200;
  const maxRules = options.maxRulesPerSpec ?? 30;
  const keywords = (
    options.behavioralKeywords ?? DEFAULT_BEHAVIORAL_KEYWORDS
  ).map((k) => k.toLowerCase());
  const forbiddenPatterns = (
    options.forbiddenPatterns ?? DEFAULT_FORBIDDEN_PATTERNS
  ).map((p) => new RegExp(p));
  const maxLines = options.maxSpecFileLines ?? 800;

  const findings: LintFinding[] = [];

  for (const spec of specs) {
    if (maxLines > 0) {
      const lineCount = getLineCount(spec, options.fileLineCounts);
      if (lineCount > maxLines) {
        findings.push({
          specFile: spec.filePath,
          ruleId: null,
          rule: "spec_file_too_large",
          severity: "warn",
          category: "spec_file_too_large",
          message: `${lineCount} lines in this spec — split when contracts diverge (limit: ${maxLines}).`,
        });
      }
    }

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

      const matched = forbiddenPatterns.find((re) =>
        re.test(rule.description ?? "")
      );
      if (matched) {
        findings.push({
          specFile: spec.filePath,
          ruleId: rule.id,
          rule: rule.title ?? "(untitled)",
          severity: "warn",
          category: "forbidden_pattern_in_description",
          message: `description matches forbidden pattern /${matched.source}/. Move history to git/PR body or to \`notes\`.`,
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
