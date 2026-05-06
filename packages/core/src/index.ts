export { loadConfig, DEFAULT_CONFIG } from "./config.js";
export { loadSpecs } from "./loader.js";
export { validateSpec } from "./schema.js";
export { interpret } from "./interpret.js";
export { deduplicate } from "./deduplicate.js";
export { organize } from "./organize.js";
export { buildManifest } from "./scan.js";
export { createSpecBranch, buildPrDescription } from "./git.js";
export { buildTrace, appendHistory } from "./trace.js";
export { submitRequirement, submitDraftFile } from "./pipeline.js";
export type {
  SpsConfig,
  CategoryConfig,
  SchemaConfig,
  LlmConfig,
  GitConfig,
  DedupConfig,
  SpecFile,
  SpecRule,
  BehaviorBlock,
  TraceBlock,
  RelatedSpec,
  TraceHistoryEntry,
  DraftSpec,
  DeduplicationResult,
  OrganizeResult,
  SubmissionContext,
  Manifest,
  ManifestEntry,
  CrossReference,
  DriftEntry,
} from "./types.js";
export type { SubmitResult } from "./pipeline.js";
export { loadPrinciples } from "./principles.js";
export type { Principle } from "./principles.js";
export { generateAgentInstructions } from "./agent.js";
export { analyzeCoverage } from "./coverage.js";
export type { CoverageResult } from "./coverage.js";
export { validateTouches } from "./validate-touches.js";
export type { TouchesWarning } from "./validate-touches.js";
export { validateUniqueness } from "./validate-uniqueness.js";
export type { DuplicateIdError } from "./validate-uniqueness.js";
export { validateCrossRefs } from "./validate-cross-refs.js";
export type { UnresolvedRefError } from "./validate-cross-refs.js";
export { validateMutations } from "./validate-mutations.js";
export type { MutationError } from "./validate-mutations.js";
export { diffSpecs } from "./diff.js";
export type {
  SpecDiff,
  DiffRuleEntry,
  DiffModifiedEntry,
  DiffTransitionEntry,
} from "./diff.js";
export { lintSpecs } from "./lint.js";
export type { LintFinding, LintOptions } from "./lint.js";
export { resolveModelId } from "./llm.js";
