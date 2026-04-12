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
  const existingSpecs = loadSpecs(repoRoot, config.specs_dir);
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
    _trace: trace,
    domain: draft.domain,
    module: draft.module,
    description: draft.description,
    rules: draft.rules,
  };

  const specContent = stringify(specObj, { lineWidth: 100 });

  const errors = validateSpec(
    { ...draft, filePath: organized.filePath } as SpecFile,
    config.schema
  );
  if (errors.length > 0) {
    throw new Error(
      `Generated spec has validation errors:\n${errors.join("\n")}`
    );
  }

  const slug = `${draft.domain}-${draft.module}`.replace(
    /[^a-z0-9-]/g,
    "-"
  );
  const { branch } = await createSpecBranch(
    repoRoot,
    organized.filePath,
    specContent,
    config,
    slug
  );

  const prDescription = buildPrDescription(
    trace,
    `${draft.domain}/${draft.module}`,
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
