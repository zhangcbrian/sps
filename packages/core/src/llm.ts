import { z } from "zod";
import type { SpsConfig } from "./types.js";

/**
 * Resolve the gateway-style model ID for an SpsConfig. Accepts either a
 * canonical "provider/model" string (preferred) or the legacy split form
 * (`provider: "anthropic"` + bare model name).
 */
export function resolveModelId(config: SpsConfig): string {
  const model = config.llm.model;
  if (model.includes("/")) return model;
  if (config.llm.provider) return `${config.llm.provider}/${model}`;
  return model;
}

const behaviorSchema = z.object({
  surface: z.string(),
  inputs: z.record(z.string(), z.string()).optional(),
  outputs: z.record(z.string(), z.string()).optional(),
  invariants: z.array(z.string()).optional(),
  errors: z
    .array(z.object({ code: z.string(), when: z.string() }))
    .optional(),
});

const ruleSchema = z.object({
  id: z.union([z.string(), z.null()]).default(null),
  title: z.string(),
  status: z
    .enum(["active", "proposed", "deprecated", "superseded", "removed"])
    .default("proposed"),
  category: z.string(),
  description: z.string(),
  given: z.string(),
  when: z.string(),
  then: z.string(),
  behavior: behaviorSchema.optional(),
  notes: z.string().optional(),
  superseded_by: z.string().optional(),
  examples: z
    .array(
      z.object({
        input: z.record(z.string(), z.any()),
        output: z.record(z.string(), z.any()),
      })
    )
    .default([]),
  edge_cases: z
    .array(
      z.object({
        case: z.string(),
        decision: z.string(),
        ref: z.string().optional(),
      })
    )
    .default([]),
  tests: z.array(z.string()).default([]),
});

export const draftSpecSchema = z.object({
  spec: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  touches: z.array(z.string()).default([]),
  rules: z.array(ruleSchema),
});

export const dedupResultSchema = z.object({
  matches: z.array(
    z.object({
      existing_rule_id: z.string(),
      draft_rule_index: z.number().int(),
      relationship: z.enum(["extends", "replaces", "conflicts", "related"]),
      confidence: z.number(),
      explanation: z.string(),
    })
  ),
});

export type DraftSpecSchema = typeof draftSpecSchema;
export type DedupResultSchema = typeof dedupResultSchema;
