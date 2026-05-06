import { generateObject } from "ai";
import type {
  DraftSpec,
  SpecFile,
  SpsConfig,
  DeduplicationResult,
} from "./types.js";
import { dedupResultSchema, resolveModelId } from "./llm.js";

export async function deduplicate(
  draft: DraftSpec,
  existingSpecs: SpecFile[],
  config: SpsConfig
): Promise<DeduplicationResult> {
  if (existingSpecs.length === 0 || !config.dedup.enabled) {
    return { matches: [] };
  }

  const existingSummaries = existingSpecs.flatMap((s) =>
    s.rules.map((r) => ({ id: r.id, title: r.title, spec: s.spec }))
  );

  const draftSummaries = draft.rules.map((r, i) => ({
    index: i,
    title: r.title,
    description: r.description,
  }));

  const system = `You compare draft spec rules against existing spec rules to find duplicates or related rules.

For each draft rule, check if any existing rule is similar. Output a JSON object with a "matches" array. Each match captures:
  - existing_rule_id: the lineage ID of the matched existing rule
  - draft_rule_index: 0-based index of the matched draft rule
  - relationship: extends | replaces | conflicts | related
  - confidence: 0.0-1.0
  - explanation: why these are related

Only include matches with confidence >= ${config.dedup.similarity_threshold}.`;

  const { object } = await generateObject({
    model: resolveModelId(config),
    schema: dedupResultSchema,
    schemaName: "DeduplicationResult",
    schemaDescription: "Matches between drafted rules and existing spec rules.",
    system,
    prompt: `Existing rules:\n${JSON.stringify(existingSummaries, null, 2)}\n\nDraft rules:\n${JSON.stringify(draftSummaries, null, 2)}`,
  });

  const ruleById = new Map<
    string,
    { rule: SpecFile["rules"][0]; spec: SpecFile }
  >();
  for (const spec of existingSpecs) {
    for (const rule of spec.rules) {
      if (rule.id) ruleById.set(rule.id, { rule, spec });
    }
  }

  const matches = object.matches
    .filter((m) => ruleById.has(m.existing_rule_id))
    .map((m) => {
      const existing = ruleById.get(m.existing_rule_id)!;
      return {
        existingSpec: existing.spec,
        existingRule: existing.rule,
        draftRule: draft.rules[m.draft_rule_index],
        relationship: m.relationship,
        confidence: m.confidence,
        explanation: m.explanation,
      };
    });

  return { matches };
}
