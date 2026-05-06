import { simpleGit, type SimpleGit } from "simple-git";
import { parse } from "yaml";
import type { SpecFile, SpecRule } from "./types.js";

export interface MutationError {
  specFile: string;
  ruleId: string;
  field: "title" | "given" | "when" | "then" | "behavior" | "transition";
  before: string;
  after: string;
}

/**
 * Status transitions that are allowed without explicit explanation.
 * `active → removed` is intentionally absent: removing an active behavior
 * is exactly the kind of silent drift this validator exists to surface.
 * The path is `active → superseded (with superseded_by)` instead.
 */
const ALLOWED_TRANSITIONS = new Set<string>([
  "proposed→active",
  "proposed→deprecated",
  "proposed→removed",
  "active→deprecated",
  "active→superseded",
  "deprecated→removed",
  "superseded→removed",
]);

const TRACKED_TEXT_FIELDS = ["title", "given", "when", "then"] as const;

/**
 * Detects edits to active rules' load-bearing fields (title, given, when,
 * then, behavior) relative to a git ref, plus silent deletions of active
 * rules and silent active→removed status jumps.
 *
 * Active rules represent shipped behavior — to change or retire them,
 * mark the old rule `superseded` (with `superseded_by:`) and add a new
 * rule. Silent edits or deletions destroy spec history and cause
 * invisible drift.
 *
 * New rules and rules whose status was not `active` at the ref are
 * skipped (other than the transition check).
 */
export async function validateMutations(
  currentSpecs: SpecFile[],
  repoRoot: string,
  againstRef: string
): Promise<MutationError[]> {
  const git = simpleGit(repoRoot);
  const errors: MutationError[] = [];

  // Collect every rule ID that exists in the working tree, across all
  // specs. A rule that "moved" from one spec file to another should not
  // be reported as a deletion — it just lives elsewhere now.
  const allCurrentIds = new Set<string>();
  for (const spec of currentSpecs) {
    for (const rule of spec.rules) {
      if (rule.id) allCurrentIds.add(rule.id);
    }
  }

  const currentFilePaths = new Set(currentSpecs.map((s) => s.filePath));

  for (const current of currentSpecs) {
    const beforeMap = await loadBeforeMap(git, againstRef, current.filePath);
    if (!beforeMap) continue;

    for (const currentRule of current.rules) {
      if (!currentRule.id) continue;
      const beforeRule = beforeMap.get(currentRule.id);
      if (!beforeRule) continue;

      const fromStatus = String(beforeRule.status ?? "");
      const toStatus = String(currentRule.status ?? "");
      if (fromStatus !== toStatus) {
        const key = `${fromStatus}→${toStatus}`;
        if (!ALLOWED_TRANSITIONS.has(key)) {
          errors.push({
            specFile: current.filePath,
            ruleId: currentRule.id,
            field: "transition",
            before: fromStatus,
            after: toStatus,
          });
        }
      }

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

    // Active rules that lived in this spec at the ref but no longer
    // exist anywhere in the working tree — silent deletions.
    for (const [id, beforeRule] of beforeMap) {
      if (allCurrentIds.has(id)) continue;
      if (String(beforeRule.status ?? "") !== "active") continue;
      errors.push({
        specFile: current.filePath,
        ruleId: id,
        field: "transition",
        before: "active",
        after: "(removed)",
      });
    }
  }

  // Spec files that existed at the ref but no longer exist at HEAD —
  // each active rule inside them is a silent deletion (unless the rule
  // moved to another spec file in the working tree).
  let refFiles: string[] = [];
  try {
    const out = await git.raw([
      "ls-tree",
      "-r",
      againstRef,
      "--name-only",
    ]);
    refFiles = out
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.endsWith(".sps.yaml"));
  } catch {
    // ignore if ref isn't navigable
  }
  for (const filePath of refFiles) {
    if (currentFilePaths.has(filePath)) continue;
    const beforeMap = await loadBeforeMap(git, againstRef, filePath);
    if (!beforeMap) continue;
    for (const [id, beforeRule] of beforeMap) {
      if (allCurrentIds.has(id)) continue;
      if (String(beforeRule.status ?? "") !== "active") continue;
      errors.push({
        specFile: filePath,
        ruleId: id,
        field: "transition",
        before: "active",
        after: "(removed)",
      });
    }
  }

  return errors;
}

async function loadBeforeMap(
  git: SimpleGit,
  ref: string,
  filePath: string
): Promise<Map<string, SpecRule> | null> {
  let content: string;
  try {
    content = await git.show([`${ref}:${filePath}`]);
  } catch {
    return null;
  }

  let parsed: { rules?: unknown };
  try {
    parsed = parse(content) ?? {};
  } catch {
    return null;
  }
  if (!parsed || !Array.isArray(parsed.rules)) return null;

  const map = new Map<string, SpecRule>();
  for (const rule of parsed.rules as SpecRule[]) {
    if (rule && typeof rule === "object" && rule.id) {
      map.set(rule.id, rule);
    }
  }
  return map;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Stable JSON serialization with deeply sorted object keys. The shallow
 * `JSON.stringify(v, Object.keys(v).sort())` form is dangerous: the
 * keys-array replacer applies the same whitelist at *every* nesting
 * level, so nested keys not present at the top level get silently
 * stripped (e.g. `{ inputs: { limit: 'number' } }` serializes to
 * `{"inputs":{}}` — losing the actual change). Use this instead.
 */
function canonical(value: unknown): string {
  if (value === undefined || value === null) return "";
  return JSON.stringify(stableSort(value));
}

function stableSort(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stableSort);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = stableSort((value as Record<string, unknown>)[key]);
  }
  return sorted;
}
