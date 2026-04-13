export { loadConfig, DEFAULT_CONFIG } from "./config.js";
export { loadSpecs } from "./loader.js";
export { validateSpec } from "./schema.js";
export { interpret } from "./interpret.js";
export { deduplicate } from "./deduplicate.js";
export { organize } from "./organize.js";
export { buildManifest } from "./scan.js";
export { createSpecBranch, buildPrDescription } from "./git.js";
export { buildTrace, appendHistory } from "./trace.js";
export { submitRequirement } from "./pipeline.js";
export type {
  SpsConfig,
  CategoryConfig,
  SchemaConfig,
  LlmConfig,
  GitConfig,
  DedupConfig,
  SpecFile,
  SpecRule,
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
