import { loadConfig } from "./config.js";
import { loadSpecs } from "./loader.js";
import { interpret } from "./interpret.js";
import { deduplicate } from "./deduplicate.js";
import { organize } from "./organize.js";
import { buildTrace } from "./trace.js";
import { createSpecBranch, buildPrDescription } from "./git.js";
import { validateSpec } from "./schema.js";
import { stringify } from "yaml";
import type {
  SubmissionContext,
  DeduplicationResult,
  SpecFile,
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
  const organized = organize(draft, existingSpecs, config);

  for (const [index, id] of organized.assignedIds) {
    draft.rules[index].id = id;
    draft.rules[index].status = "active";
  }

  const trace = buildTrace(context, config.llm.model);
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

  const errors = validateSpec(
    { ...draft, filePath: organized.filePath } as SpecFile,
    config.schema,
    config.categories
  );
  if (errors.length > 0) {
    throw new Error(
      `Generated spec has validation errors:\n${errors.join("\n")}`
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
