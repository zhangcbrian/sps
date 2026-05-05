import Anthropic from "@anthropic-ai/sdk";
import type { DraftSpec, SpecFile, SpsConfig } from "./types.js";

function buildSystemPrompt(
  config: SpsConfig,
  existingSpecs: SpecFile[]
): string {
  const specSummaries = existingSpecs
    .flatMap((s) =>
      s.rules.map((r) => `${r.id}: ${r.title} (${s.spec})`)
    )
    .join("\n");

  const validCategories = config.categories.map((c) => c.id).join("|");

  return `You are a requirements analyst. Your job is to convert natural language feature descriptions into structured spec JSON.

Output a JSON object with this exact structure:
{
  "spec": "domain/module",
  "title": "Human-readable name for this spec",
  "description": "Plain English description for business stakeholders",
  "category": "${validCategories}",
  "touches": ["other-domain-this-affects"],
  "rules": [
    {
      "id": null,
      "title": "One-line readable title for this rule",
      "status": "proposed",
      "category": "${validCategories}",
      "description": "Detailed explanation a product manager can read",
      "given": "Preconditions with concrete values ($50 stake, 24 hours before, etc.)",
      "when": "The trigger action",
      "then": "The expected outcome with concrete values",
      "behavior": {
        "surface": "addressable.function.or.route.path",
        "inputs": { "fieldName": "type description" },
        "outputs": { "fieldName": "type description" },
        "invariants": ["load-bearing invariant 1", "invariant 2"],
        "errors": [{ "code": "ERROR_CODE", "when": "human-readable trigger" }]
      },
      "examples": [{ "input": {}, "output": {} }],
      "edge_cases": [{ "case": "description", "decision": "what happens" }],
      "tests": []
    }
  ]
}

Rules for writing specs:
- Write title, description, given, when, then in plain English — no code, no function names there.
- The "behavior" block is the structured machine-readable contract. Use it for behavioral surfaces (API endpoints, UI components, background jobs). Skip the "behavior" block for purely structural rules (e.g. schema shape, naming conventions).
- "behavior.surface" is a stable identifier the implementation will live behind: a function path, route, or component identifier. Required when "behavior" is present.
- "behavior.invariants" hold ≤3 entries — keep them load-bearing facts ("filtered by ctx.orgId", "ordered by (first_name, last_name, id) ASC", "ban-listed entries are excluded"). Skip vague invariants.
- "behavior.errors" lists expected error cases the caller must handle.
- Each rule should be independently testable.
- Break complex features into multiple rules (one behavior per rule).
- Monetary values in examples use cents (integer).
- The "spec" field uses "domain/module" format, all lowercase.
- The "touches" field lists other domains this spec affects beyond its own.
- Status defaults to "proposed" for new rules.

${specSummaries ? `Existing specs in this repo (avoid duplicating these):\n${specSummaries}` : "No existing specs in this repo yet."}

Respond with ONLY the JSON object. No markdown, no explanation.`;
}

export async function interpret(
  text: string,
  existingSpecs: SpecFile[],
  config: SpsConfig
): Promise<DraftSpec> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: config.llm.model,
    max_tokens: 4096,
    system: buildSystemPrompt(config, existingSpecs),
    messages: [{ role: "user", content: text }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from LLM");
  }

  let draft: DraftSpec;
  try {
    draft = JSON.parse(content.text) as DraftSpec;
  } catch {
    throw new Error(
      `LLM returned invalid JSON. Raw response:\n${content.text.slice(0, 500)}`
    );
  }
  return draft;
}
