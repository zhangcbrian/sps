import { simpleGit } from "simple-git";
import { parse } from "yaml";
import type { SpecFile, SpecRule } from "./types.js";

export interface MutationError {
  specFile: string;
  ruleId: string;
  field: "title" | "given" | "when" | "then" | "behavior";
  before: string;
  after: string;
}

const TRACKED_TEXT_FIELDS = ["title", "given", "when", "then"] as const;

/**
 * Detects edits to active rules' load-bearing fields (title, given, when, then)
 * relative to a git ref. Active rules represent shipped behavior — to change
 * them, mark the old rule `superseded` and add a new rule. Silent edits
 * destroy spec history and cause invisible drift.
 *
 * New rules and rules whose status was not `active` at the ref are skipped.
 */
export async function validateMutations(
  currentSpecs: SpecFile[],
  repoRoot: string,
  againstRef: string
): Promise<MutationError[]> {
  const git = simpleGit(repoRoot);
  const errors: MutationError[] = [];

  for (const current of currentSpecs) {
    let beforeContent: string;
    try {
      beforeContent = await git.show([`${againstRef}:${current.filePath}`]);
    } catch {
      // file did not exist at the ref — entirely new spec, nothing to compare
      continue;
    }

    let beforeParsed: { rules?: unknown };
    try {
      beforeParsed = parse(beforeContent) ?? {};
    } catch {
      continue;
    }
    if (!beforeParsed || !Array.isArray(beforeParsed.rules)) continue;

    const beforeMap = new Map<string, SpecRule>();
    for (const rule of beforeParsed.rules as SpecRule[]) {
      if (rule && typeof rule === "object" && rule.id) {
        beforeMap.set(rule.id, rule);
      }
    }

    for (const currentRule of current.rules) {
      if (!currentRule.id) continue;
      const beforeRule = beforeMap.get(currentRule.id);
      if (!beforeRule) continue;
      if (beforeRule.status !== "active") continue;

      for (const field of TRACKED_TEXT_FIELDS) {
        const beforeVal = String(beforeRule[field] ?? "");
        const afterVal = String(currentRule[field] ?? "");
        if (normalize(beforeVal) !== normalize(afterVal)) {
          errors.push({
            specFile: current.filePath,
            ruleId: currentRule.id,
            field,
            before: beforeVal,
            after: afterVal,
          });
        }
      }

      const beforeBehavior = canonical(beforeRule.behavior);
      const afterBehavior = canonical(currentRule.behavior);
      if (beforeBehavior !== afterBehavior) {
        errors.push({
          specFile: current.filePath,
          ruleId: currentRule.id,
          field: "behavior",
          before: beforeBehavior || "(none)",
          after: afterBehavior || "(none)",
        });
      }
    }
  }

  return errors;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function canonical(value: unknown): string {
  if (value === undefined || value === null) return "";
  return JSON.stringify(value, Object.keys(value as object).sort());
}
