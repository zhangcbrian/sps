import type { SpecFile, SpecRule } from "./types.js";

const REF_PATTERN = /\bREQ-[A-Z][A-Z0-9-]*-\d+\b/g;

export interface UnresolvedRefError {
  specFile: string;
  ruleIndex: number;
  ruleId: string | null;
  unresolvedRef: string;
  field:
    | "description"
    | "given"
    | "when"
    | "then"
    | "notes"
    | "edge_case"
    | "superseded_by"
    | "behavior";
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
      scan(rule.notes, spec, i, rule, "notes");
      for (const ec of rule.edge_cases || []) {
        scan(ec.case, spec, i, rule, "edge_case");
        scan(ec.decision, spec, i, rule, "edge_case");
      }

      // Behavior block strings can carry citations too — invariants
      // commonly reference companion rules ("see REQ-XYZ-01") and
      // errors[*].when often quotes domain context that may cite an
      // upstream rule. Skip without behavior; otherwise scan.
      if (rule.behavior) {
        for (const inv of rule.behavior.invariants ?? []) {
          scan(inv, spec, i, rule, "behavior");
        }
        for (const err of rule.behavior.errors ?? []) {
          scan(err.when, spec, i, rule, "behavior");
        }
      }

      // Lifecycle link: a rule's superseded_by must resolve to a real
      // rule that is not the rule itself. Schema validation only checks
      // that the field is present (when status is "superseded") — it
      // does not check that the target exists or that it points
      // somewhere meaningful. A typo here silently breaks the
      // supersedence chain; a self-reference creates a cycle that looks
      // valid to every other tool.
      if (
        typeof rule.superseded_by === "string" &&
        rule.superseded_by.length > 0
      ) {
        const isSelf = rule.superseded_by === rule.id;
        if (isSelf || !knownIds.has(rule.superseded_by)) {
          errors.push({
            specFile: spec.filePath,
            ruleIndex: i,
            ruleId: rule.id,
            unresolvedRef: rule.superseded_by,
            field: "superseded_by",
          });
        }
      }
    }
  }

  return errors;
}
