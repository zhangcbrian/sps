// --- Config ---

export interface CategoryConfig {
  id: string;
  label: string;
  description: string;
  color: string;
}

export interface SpecflowConfig {
  version: number;
  specs_dir: string;
  schema: SchemaConfig;
  domains: Record<string, string>;
  categories: CategoryConfig[];
  llm: LlmConfig;
  git: GitConfig;
  dedup: DedupConfig;
}

export interface SchemaConfig {
  required_top_level: string[];
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

// --- Spec ---

export interface SpecRule {
  id: string | null;
  status: "active" | "proposed" | "deprecated";
  category: string;
  business_title: string;
  summary: string;
  description: string;
  given: string;
  when: string;
  then: string;
  examples: Array<{
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  }>;
  edge_cases: Array<{ case: string; decision: string; ref: string }>;
  tests: string[];
  added: string;
  modified: string | null;
}

export interface SpecFile {
  _trace?: TraceBlock;
  domain: string;
  module: string;
  description: string;
  rules: SpecRule[];
  filePath: string;
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
  domain: string;
  module: string;
  description: string;
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
  domain: string;
  module: string;
  assignedIds: Map<number, string>;
  isNewFile: boolean;
}

// --- Submission ---

export interface SubmissionContext {
  text: string;
  submittedBy: string;
  source: "portal" | "cli" | "api";
  mode: "quick" | "guided";
}

// --- Guided mode ---

export interface GuidedTurn {
  question: string;
  answer?: string;
}

export interface GuidedSession {
  context: SubmissionContext;
  turns: GuidedTurn[];
  currentDraft: DraftSpec | null;
}
