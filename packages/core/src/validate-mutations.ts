import { simpleGit, type SimpleGit } from "simple-git";
import { parse } from "yaml";
import type { SpecRule } from "./types.js";
import type { SpecFile } from "./types.js";

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

interface BeforeRule {
  rule: SpecRule;
  filePath: string;
}

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
 * The ref-side rule map is built globally across every `.sps.yaml` file
 * that existed at the ref. This makes the check robust to cross-file
 * rule moves: a rule that moved from spec A to spec B and was edited in
 * the same change is compared against its old ref version in spec A,
 * not against an empty per-file lookup in spec B.
 */
export async function validateMutations(
  currentSpecs: SpecFile[],
  repoRoot: string,
  againstRef: string
): Promise<MutationError[]> {
  const git = simpleGit(repoRoot);
  const errors: MutationError[] = [];

  const refMap = await buildRefRuleMap(git, againstRef);

  // Track rule IDs that exist in the current working tree, anywhere.
  // A rule that "moved" between spec files is still present, so its ID
  // is in this set even if it's gone from the ref-side path.
  const allCurrentIds = new Set<string>();
  for (const spec of currentSpecs) {
    for (const rule of spec.rules) {
      if (rule.id) allCurrentIds.add(rule.id);
    }
  }

  for (const current of currentSpecs) {
    for (const currentRule of current.rules) {
      if (!currentRule.id) continue;
      const before = refMap.get(currentRule.id);
      if (!before) continue;

      const fromStatus = String(before.rule.status ?? "");
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

      if (before.rule.status !== "active") continue;

      for (const field of TRACKED_TEXT_FIELDS) {
        const beforeVal = String(before.rule[field] ?? "");
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

      const beforeBehavior = canonical(before.rule.behavior);
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

  // Active rules that lived somewhere at the ref but no longer exist
  // anywhere in the working tree — silent deletions.
  for (const [id, before] of refMap) {
    if (allCurrentIds.has(id)) continue;
    if (String(before.rule.status ?? "") !== "active") continue;
    errors.push({
      specFile: before.filePath,
      ruleId: id,
      field: "transition",
      before: "active",
      after: "(removed)",
    });
  }

  return errors;
}

async function buildRefRuleMap(
  git: SimpleGit,
  ref: string
): Promise<Map<string, BeforeRule>> {
  const map = new Map<string, BeforeRule>();
  let files: string[] = [];
  try {
    const out = await git.raw(["ls-tree", "-r", ref, "--name-only"]);
    files = out
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.endsWith(".sps.yaml"));
  } catch {
    return map;
  }

  for (const filePath of files) {
    let content: string;
    try {
      content = await git.show([`${ref}:${filePath}`]);
    } catch {
      continue;
    }
    let parsed: { rules?: unknown };
    try {
      parsed = parse(content) ?? {};
    } catch {
      continue;
    }
    if (!parsed || !Array.isArray(parsed.rules)) continue;
    for (const rule of parsed.rules as SpecRule[]) {
      if (rule && typeof rule === "object" && rule.id) {
        // First occurrence wins — duplicate IDs at the ref are a
        // pre-existing schema problem outside this validator's remit.
        if (!map.has(rule.id)) {
          map.set(rule.id, { rule, filePath });
        }
      }
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
