import { readFileSync } from "fs";
import { parse as parseYaml, stringify } from "yaml";
import { loadConfig } from "./config.js";
import { loadSpecs } from "./loader.js";
import { interpret } from "./interpret.js";
import { deduplicate } from "./deduplicate.js";
import { organize } from "./organize.js";
import { buildTrace } from "./trace.js";
import { createSpecBranch, buildPrDescription } from "./git.js";
import { validateSpec } from "./schema.js";
import { validateUniqueness } from "./validate-uniqueness.js";
import { validateCrossRefs } from "./validate-cross-refs.js";
import type {
  SubmissionContext,
  DeduplicationResult,
  DraftSpec,
  SpecFile,
  SpsConfig,
  TraceBlock,
} from "./types.js";

export interface SubmitResult {
  filePath: string;
  branch: string;
  ruleCount: number;
  deduplication: DeduplicationResult;
  specContent: string;
  prDescription: string;
}

export async function submitRequirement(
  repoRoot: string,
  context: SubmissionContext
): Promise<SubmitResult> {
  const config = loadConfig(repoRoot);
  const existingSpecs = loadSpecs(repoRoot);
  const draft = await interpret(context.text, existingSpecs, config);
  const dedup = await deduplicate(draft, existingSpecs, config);
  return finalize(repoRoot, draft, existingSpecs, config, context, dedup);
}

/**
 * Submit a hand-authored draft YAML — bypasses interpret + deduplicate.
 * Use when you've already written the spec yourself (or for repos that
 * intentionally don't run an LLM in the spec pipeline).
 */
export async function submitDraftFile(
  repoRoot: string,
  draftPath: string,
  context: SubmissionContext
): Promise<SubmitResult> {
  const config = loadConfig(repoRoot);
  const existingSpecs = loadSpecs(repoRoot);

  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(draftPath, "utf-8"));
  } catch (err) {
    throw new Error(
      `Failed to read draft file ${draftPath}: ${(err as Error).message}`
    );
  }
  if (
    !raw ||
    typeof raw !== "object" ||
    !Array.isArray((raw as { rules?: unknown }).rules)
  ) {
    throw new Error(
      `Draft file ${draftPath} must be a YAML object with a "rules" array.`
    );
  }
  const draft = raw as DraftSpec;

  return finalize(
    repoRoot,
    draft,
    existingSpecs,
    config,
    context,
    { matches: [] }
  );
}

async function finalize(
  repoRoot: string,
  draft: DraftSpec,
  existingSpecs: SpecFile[],
  config: SpsConfig,
  context: SubmissionContext,
  dedup: DeduplicationResult
): Promise<SubmitResult> {
  const organized = organize(draft, existingSpecs, config);

  for (const [index, id] of organized.assignedIds) {
    draft.rules[index].id = id;
    if (draft.rules[index].status === "proposed") {
      draft.rules[index].status = "active";
    }
  }

  const trace: TraceBlock = buildTrace(context, config.llm.model);
  trace.related_specs = dedup.matches.map((m) => ({
    id: m.existingRule.id!,
    relationship: m.relationship,
    note: m.explanation,
  }));

  const specObj: Record<string, unknown> = {
    spec: draft.spec,
    title: draft.title,
    description: draft.description,
    category: draft.category,
    touches: draft.touches,
    rules: draft.rules,
    _trace: trace,
  };

  const specContent = stringify(specObj, { lineWidth: 100 });

  const draftAsSpecFile: SpecFile = {
    ...draft,
    filePath: organized.filePath,
  } as SpecFile;
  const errors = validateSpec(
    draftAsSpecFile,
    config.schema,
    config.categories
  );
  if (errors.length > 0) {
    throw new Error(
      `Generated spec has validation errors:\n${errors.join("\n")}`
    );
  }

  // Cross-corpus validation: a draft can only be committed if it doesn't
  // collide with existing IDs and doesn't cite missing rules. Without
  // these gates, `sps submit --offline` could produce a branch that
  // immediately fails the matching `sps validate` checks downstream.
  // Existing specs whose path matches the new draft are excluded from
  // the corpus snapshot — when re-submitting an updated draft for an
  // existing spec, the draft replaces the prior version rather than
  // colliding with it.
  const corpus: SpecFile[] = [
    ...existingSpecs.filter((s) => s.filePath !== organized.filePath),
    draftAsSpecFile,
  ];
  const duplicates = validateUniqueness(corpus);
  if (duplicates.length > 0) {
    const lines = duplicates
      .map(
        (d) =>
          `  ${d.id}: ${d.occurrences.map((o) => o.specFile).join(", ")}`
      )
      .join("\n");
    throw new Error(
      `Generated spec collides with existing rule IDs:\n${lines}`
    );
  }
  const unresolvedRefs = validateCrossRefs(corpus);
  const draftRefs = unresolvedRefs.filter(
    (u) => u.specFile === organized.filePath
  );
  if (draftRefs.length > 0) {
    const lines = draftRefs
      .map(
        (u) =>
          `  ${u.ruleId ?? `[${u.ruleIndex}]`} (${u.field}): cites "${u.unresolvedRef}"`
      )
      .join("\n");
    throw new Error(
      `Generated spec cites unresolved REQ-* IDs:\n${lines}`
    );
  }

  const slug = draft.spec.replace(/\//g, "-").replace(/[^a-z0-9-]/g, "-");
  const { branch } = await createSpecBranch(
    repoRoot,
    organized.filePath,
    specContent,
    config,
    slug
  );

  const prDescription = buildPrDescription(
    trace,
    draft.spec,
    draft.rules.length
  );

  return {
    filePath: organized.filePath,
    branch,
    ruleCount: draft.rules.length,
    deduplication: dedup,
    specContent,
    prDescription,
  };
}
