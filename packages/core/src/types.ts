// --- Config ---

export interface CategoryConfig {
  id: string;
  label: string;
  description: string;
  color: string;
}

export interface SchemaConfig {
  required_fields: string[];
  required_rule_fields: string[];
  forbidden_rule_fields: string[];
  id_format: string;
}

export interface LlmConfig {
  provider: "anthropic" | "openai";
  model: string;
}

export interface GitConfig {
  branch_prefix: string;
  commit_prefix: string;
  create_pr: boolean;
  pr_platform: "github" | "gitlab" | "bitbucket" | "none";
}

export interface DedupConfig {
  enabled: boolean;
  similarity_threshold: number;
}

export interface SpsConfig {
  version: number;
  schema: SchemaConfig;
  domains: Record<string, string>;
  categories: CategoryConfig[];
  llm: LlmConfig;
  git: GitConfig;
  dedup: DedupConfig;
}

// --- Spec ---

/**
 * Optional structured contract for a rule (v0.2). Captures the load-bearing
 * facts about a behavioral surface without relying on prose interpretation.
 *
 * Pure structural rules (schema shape, ID format conventions) usually do
 * not need a behavior block — Given/When/Then is awkward for those.
 * Behavioral rules (API procedures, UI flows, jobs) benefit most.
 */
export interface BehaviorBlock {
  /** Function path, route, component, or other addressable surface. */
  surface: string;
  /** Parameter shape, written as field → type description. */
  inputs?: Record<string, string>;
  /** Return / output shape, written as field → type description. */
  outputs?: Record<string, string>;
  /** Load-bearing invariants the implementation must uphold. Keep to ≤3. */
  invariants?: string[];
  /** Expected error cases. */
  errors?: Array<{ code: string; when: string }>;
}

export interface SpecRule {
  id: string | null;
  title: string;
  status: "active" | "proposed" | "deprecated" | "superseded" | "removed";
  category: string;
  description: string;
  given: string;
  when: string;
  then: string;
  /** Optional structured contract — added in v0.2. */
  behavior?: BehaviorBlock;
  /** Free-form prose notes. Promoted from the description for v0.2 — keep `description` for the human-readable summary, use `notes` for caveats and history. */
  notes?: string;
  /** Successor rule when this rule is `status: superseded`. */
  superseded_by?: string;
  examples: Array<{
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  }>;
  edge_cases: Array<{ case: string; decision: string; ref?: string }>;
  tests: string[];
}

export interface SpecFile {
  spec: string;
  title: string;
  description: string;
  category: string;
  touches: string[];
  rules: SpecRule[];
  filePath: string;
  _trace?: TraceBlock;
}

// --- Trace ---

export interface TraceBlock {
  requested_by: string;
  requested_at: string;
  original_text: string;
  interpretation_model: string;
  interpretation_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source: "portal" | "cli" | "api";
  related_specs: RelatedSpec[];
  history: TraceHistoryEntry[];
}

export interface RelatedSpec {
  id: string;
  relationship: "extends" | "replaces" | "conflicts" | "related";
  note: string;
}

export interface TraceHistoryEntry {
  action: "created" | "modified" | "reviewed" | "approved" | "deprecated";
  by: string;
  at: string;
  reason?: string;
}

// --- Draft ---

export interface DraftSpec {
  spec: string;
  title: string;
  description: string;
  category: string;
  touches: string[];
  rules: SpecRule[];
}

// --- Deduplication ---

export interface DeduplicationResult {
  matches: Array<{
    existingSpec: SpecFile;
    existingRule: SpecRule;
    draftRule: SpecRule;
    relationship: "extends" | "replaces" | "conflicts" | "related";
    confidence: number;
    explanation: string;
  }>;
}

// --- Organize ---

export interface OrganizeResult {
  filePath: string;
  spec: string;
  assignedIds: Map<number, string>;
  isNewFile: boolean;
}

// --- Manifest ---

export interface ManifestEntry {
  path: string;
  spec: string;
  title: string;
  categories: string[];
  rule_count: number;
  touches: string[];
  status_summary: Record<string, number>;
}

export interface CrossReference {
  touched_by: Array<{
    spec: string;
    path: string;
    rules: string[];
  }>;
}

export interface DriftEntry {
  path: string;
  issue: string;
}

export interface Manifest {
  generated_at: string;
  specs: ManifestEntry[];
  totals: {
    files: number;
    rules: number;
    by_category: Record<string, number>;
    by_status: Record<string, number>;
  };
  cross_references: Record<string, CrossReference>;
  drift: DriftEntry[];
}

// --- Submission ---

export interface SubmissionContext {
  text: string;
  submittedBy: string;
  source: "portal" | "cli" | "api";
  mode: "quick" | "guided";
  category?: string;
  suggestedPath?: string;
}
