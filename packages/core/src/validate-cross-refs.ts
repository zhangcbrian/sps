import type { SpecFile, SpecRule } from "./types.js";

const REF_PATTERN = /\bREQ-[A-Z][A-Z0-9-]*-\d+\b/g;

export interface UnresolvedRefError {
  specFile: string;
  ruleIndex: number;
  ruleId: string | null;
  unresolvedRef: string;
  field: "description" | "given" | "when" | "then" | "notes" | "edge_case";
}

/**
 * Detects citations of REQ-* IDs that do not resolve to any known rule.
 * Catches the "I cited a rule that got removed two PRs ago" failure mode.
 */
export function validateCrossRefs(specs: SpecFile[]): UnresolvedRefError[] {
  const knownIds = new Set<string>();
  for (const spec of specs) {
    for (const rule of spec.rules) {
      if (rule.id) knownIds.add(rule.id);
    }
  }

  const errors: UnresolvedRefError[] = [];

  const scan = (
    text: string | undefined,
    spec: SpecFile,
    ruleIndex: number,
    rule: SpecRule,
    field: UnresolvedRefError["field"]
  ) => {
    if (typeof text !== "string" || text.length === 0) return;
    const seen = new Set<string>();
    const matches = text.match(REF_PATTERN);
    if (!matches) return;
    for (const ref of matches) {
      if (ref === rule.id) continue;
      if (seen.has(ref)) continue;
      seen.add(ref);
      if (!knownIds.has(ref)) {
        errors.push({
          specFile: spec.filePath,
          ruleIndex,
          ruleId: rule.id,
          unresolvedRef: ref,
          field,
        });
      }
    }
  };

  for (const spec of specs) {
    for (let i = 0; i < spec.rules.length; i++) {
      const rule = spec.rules[i];
      scan(rule.description, spec, i, rule, "description");
      scan(rule.given, spec, i, rule, "given");
      scan(rule.when, spec, i, rule, "when");
      scan(rule.then, spec, i, rule, "then");
      for (const ec of rule.edge_cases || []) {
        scan(ec.case, spec, i, rule, "edge_case");
        scan(ec.decision, spec, i, rule, "edge_case");
      }
    }
  }

  return errors;
}
