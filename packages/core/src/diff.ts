import { simpleGit, type SimpleGit } from "simple-git";
import { parse } from "yaml";
import type { SpecFile, SpecRule } from "./types.js";

export interface DiffRuleEntry {
  ruleId: string;
  specFile: string;
  title: string;
  status: string;
}

export interface DiffModifiedEntry extends DiffRuleEntry {
  fields: string[];
}

export interface DiffTransitionEntry extends DiffRuleEntry {
  fromStatus: string;
  toStatus: string;
  supersededBy: string | null;
}

export interface SpecDiff {
  ref: string;
  added: DiffRuleEntry[];
  removed: DiffRuleEntry[];
  modified: DiffModifiedEntry[];
  transitioned: DiffTransitionEntry[];
  files_added: string[];
  files_removed: string[];
}

const TRACKED_FIELDS = ["title", "given", "when", "then", "description"] as const;

/**
 * Compute the spec-level diff between the working tree and a git ref.
 * Powers `sps diff` and the PR-description "rules touched in this PR" block.
 */
export async function diffSpecs(
  currentSpecs: SpecFile[],
  repoRoot: string,
  ref: string
): Promise<SpecDiff> {
  const git = simpleGit(repoRoot);
  const refFiles = await listSpsFilesAtRef(git, ref);
  const refSpecs = await loadSpecsAtRef(git, ref, refFiles);

  const currentMap = buildIdMap(currentSpecs);
  const refMap = buildIdMap(refSpecs);

  const currentFilePaths = new Set(currentSpecs.map((s) => s.filePath));
  const refFilePaths = new Set(refSpecs.map((s) => s.filePath));

  const diff: SpecDiff = {
    ref,
    added: [],
    removed: [],
    modified: [],
    transitioned: [],
    files_added: [...currentFilePaths].filter((f) => !refFilePaths.has(f)).sort(),
    files_removed: [...refFilePaths].filter((f) => !currentFilePaths.has(f)).sort(),
  };

  for (const [id, current] of currentMap) {
    const before = refMap.get(id);
    if (!before) {
      diff.added.push({
        ruleId: id,
        specFile: current.specFile,
        title: current.rule.title ?? "",
        status: String(current.rule.status ?? ""),
      });
      continue;
    }

    const fromStatus = String(before.rule.status ?? "");
    const toStatus = String(current.rule.status ?? "");

    if (fromStatus !== toStatus) {
      diff.transitioned.push({
        ruleId: id,
        specFile: current.specFile,
        title: current.rule.title ?? "",
        status: toStatus,
        fromStatus,
        toStatus,
        supersededBy:
          (current.rule as unknown as Record<string, unknown>).superseded_by as
            | string
            | null
            | undefined ?? null,
      });
      continue;
    }

    const changed: string[] = [];
    for (const field of TRACKED_FIELDS) {
      const beforeVal = normalize(String((before.rule as unknown as Record<string, unknown>)[field] ?? ""));
      const afterVal = normalize(String((current.rule as unknown as Record<string, unknown>)[field] ?? ""));
      if (beforeVal !== afterVal) changed.push(field);
    }
    if (changed.length > 0) {
      diff.modified.push({
        ruleId: id,
        specFile: current.specFile,
        title: current.rule.title ?? "",
        status: toStatus,
        fields: changed,
      });
    }
  }

  for (const [id, before] of refMap) {
    if (!currentMap.has(id)) {
      diff.removed.push({
        ruleId: id,
        specFile: before.specFile,
        title: before.rule.title ?? "",
        status: String(before.rule.status ?? ""),
      });
    }
  }

  diff.added.sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  diff.removed.sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  diff.modified.sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  diff.transitioned.sort((a, b) => a.ruleId.localeCompare(b.ruleId));

  return diff;
}

async function listSpsFilesAtRef(git: SimpleGit, ref: string): Promise<string[]> {
  const out = await git.raw(["ls-tree", "-r", ref, "--name-only"]);
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.endsWith(".sps.yaml"));
}

async function loadSpecsAtRef(
  git: SimpleGit,
  ref: string,
  files: string[]
): Promise<SpecFile[]> {
  const specs: SpecFile[] = [];
  for (const filePath of files) {
    try {
      const content = await git.show([`${ref}:${filePath}`]);
      const parsed = parse(content);
      if (parsed && Array.isArray(parsed.rules)) {
        specs.push({ ...parsed, filePath } as SpecFile);
      }
    } catch {
      // file unreadable at ref — skip
    }
  }
  return specs;
}

function buildIdMap(
  specs: SpecFile[]
): Map<string, { rule: SpecRule; specFile: string }> {
  const map = new Map<string, { rule: SpecRule; specFile: string }>();
  for (const spec of specs) {
    for (const rule of spec.rules) {
      if (rule.id) {
        map.set(rule.id, { rule, specFile: spec.filePath });
      }
    }
  }
  return map;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
