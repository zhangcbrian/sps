import { generateObject } from "ai";
import type { DraftSpec, SpecFile, SpsConfig } from "./types.js";
import { draftSpecSchema, resolveModelId } from "./llm.js";

function buildSystemPrompt(
  config: SpsConfig,
  existingSpecs: SpecFile[]
): string {
  const specSummaries = existingSpecs
    .flatMap((s) => s.rules.map((r) => `${r.id}: ${r.title} (${s.spec})`))
    .join("\n");

  const validCategories = config.categories.map((c) => c.id).join("|");

  const postlude = config.prompts?.interpret_postlude;

  return `You are a requirements analyst. Convert the user's natural language feature description into a structured spec.

Rules:
- Write title, description, given, when, then in plain English — no code, no function names there.
- Use real dollar amounts, time ranges, and concrete user actions.
- Each rule should be independently testable.
- Break complex features into multiple rules (one behavior per rule).
- Monetary values in examples use cents (integer).
- The "spec" field uses "domain/module" format, all lowercase.
- The "touches" field lists other domains this spec affects beyond its own.

Behavior block:
- Behavioral surfaces (API endpoints, UI components, background jobs) get a "behavior" block with surface (required), inputs, outputs, invariants (≤3, load-bearing), and errors.
- Pure structural rules (schema shape, naming conventions, type-only constants) skip the "behavior" block — Given/When/Then is enough.
- "behavior.surface" is a stable identifier the implementation will live behind: a function path, route, or component name.

Categories: ${validCategories}
Status defaults to "proposed" for new rules.

${specSummaries ? `Existing rules in this repo (avoid duplicating these):\n${specSummaries}` : "No existing specs in this repo yet."}${postlude ? `\n\n--- Repo-specific guidance ---\n${postlude}` : ""}`;
}

export async function interpret(
  text: string,
  existingSpecs: SpecFile[],
  config: SpsConfig
): Promise<DraftSpec> {
  const { object } = await generateObject({
    model: resolveModelId(config),
    schema: draftSpecSchema,
    schemaName: "DraftSpec",
    schemaDescription: "A drafted SPS spec converted from a natural-language requirement.",
    system: buildSystemPrompt(config, existingSpecs),
    prompt: text,
  });
  return object as unknown as DraftSpec;
}
