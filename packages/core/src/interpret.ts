import Anthropic from "@anthropic-ai/sdk";
import type { DraftSpec, SpecFile, SpecflowConfig } from "./types.js";

function buildSystemPrompt(
  config: SpecflowConfig,
  existingSpecs: SpecFile[]
): string {
  const specSummaries = existingSpecs
    .flatMap((s) =>
      s.rules.map(
        (r) => `${r.id}: ${r.summary} (${s.domain}/${s.module})`
      )
    )
    .join("\n");

  return `You are a requirements analyst. Your job is to convert natural language feature descriptions into structured spec YAML.

Output a JSON object with this exact structure:
{
  "domain": "lowercase domain name",
  "module": "lowercase module name",
  "description": "Plain English description for business stakeholders",
  "rules": [
    {
      "id": null,
      "status": "proposed",
      "summary": "One-line business rule in plain English",
      "description": "Detailed explanation a product manager can read",
      "given": "Preconditions with concrete values ($50 stake, 24 hours before, etc.)",
      "when": "The trigger action",
      "then": "The expected outcome with concrete values",
      "examples": [{"input": {}, "output": {}}],
      "edge_cases": [{"case": "description", "decision": "what happens", "ref": ""}],
      "tests": [],
      "added": "${new Date().toISOString().split("T")[0]}",
      "modified": null
    }
  ]
}

Rules for writing specs:
- Write summary, description, given, when, then in plain English — no code, no function names
- Use real dollar amounts, time ranges, and concrete user actions
- Each rule should be independently testable
- Break complex features into multiple rules (one behavior per rule)
- Monetary values in examples use cents (integer)

${specSummaries ? `Existing specs in this repo (avoid duplicating these):\n${specSummaries}` : "No existing specs in this repo yet."}

Respond with ONLY the JSON object. No markdown, no explanation.`;
}

export async function interpret(
  text: string,
  existingSpecs: SpecFile[],
  config: SpecflowConfig
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

  const draft = JSON.parse(content.text) as DraftSpec;
  return draft;
}
