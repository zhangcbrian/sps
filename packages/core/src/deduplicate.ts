import Anthropic from "@anthropic-ai/sdk";
import type {
  DraftSpec,
  SpecFile,
  SpsConfig,
  DeduplicationResult,
} from "./types.js";

interface LlmMatch {
  existing_rule_id: string;
  draft_rule_index: number;
  relationship: "extends" | "replaces" | "conflicts" | "related";
  confidence: number;
  explanation: string;
}

export async function deduplicate(
  draft: DraftSpec,
  existingSpecs: SpecFile[],
  config: SpsConfig
): Promise<DeduplicationResult> {
  if (existingSpecs.length === 0 || !config.dedup.enabled) {
    return { matches: [] };
  }

  const existingSummaries = existingSpecs.flatMap((s) =>
    s.rules.map((r) => ({
      id: r.id,
      title: r.title,
      spec: s.spec,
    }))
  );

  const draftSummaries = draft.rules.map((r, i) => ({
    index: i,
    title: r.title,
    description: r.description,
  }));

  const client = new Anthropic();

  const response = await client.messages.create({
    model: config.llm.model,
    max_tokens: 2048,
    system: `You compare draft spec rules against existing spec rules to find duplicates or related rules.

For each draft rule, check if any existing rule is similar. Return a JSON object:
{
  "matches": [
    {
      "existing_rule_id": "REQ-...",
      "draft_rule_index": 0,
      "relationship": "extends|replaces|conflicts|related",
      "confidence": 0.0-1.0,
      "explanation": "Why these are related"
    }
  ]
}

Only include matches with confidence >= ${config.dedup.similarity_threshold}.
Respond with ONLY the JSON object.`,
    messages: [
      {
        role: "user",
        content: `Existing rules:\n${JSON.stringify(existingSummaries, null, 2)}\n\nDraft rules:\n${JSON.stringify(draftSummaries, null, 2)}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return { matches: [] };
  }

  let llmResult: { matches: LlmMatch[] };
  try {
    llmResult = JSON.parse(content.text) as { matches: LlmMatch[] };
  } catch {
    return { matches: [] };
  }

  const ruleById = new Map<
    string,
    { rule: SpecFile["rules"][0]; spec: SpecFile }
  >();
  for (const spec of existingSpecs) {
    for (const rule of spec.rules) {
      if (rule.id) ruleById.set(rule.id, { rule, spec });
    }
  }

  const matches = llmResult.matches
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
