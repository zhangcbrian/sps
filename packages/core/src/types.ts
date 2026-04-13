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

export interface SpecRule {
  id: string | null;
  title: string;
  status: "active" | "proposed" | "deprecated";
  category: string;
  description: string;
  given: string;
  when: string;
  then: string;
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
