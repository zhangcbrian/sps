# SPS Rename & File System Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the project from Specstory/Specflow to SPS ("Spec, Plan, Ship"), replace the centralized `specs/` directory with co-located `.sps.yaml` files, add a manifest system, and update all packages.

**Architecture:** Three packages (`@sps/core`, `@sps/cli`, `@sps/portal`) sharing one core engine. Specs are `.sps.yaml` files co-located with source code. A root `.sps/` directory holds global config and an auto-generated manifest. The manifest is rebuilt on staleness or `sps scan`.

**Tech Stack:** TypeScript, Vitest, pnpm workspaces, Next.js 15, React 19, Commander, Chalk, yaml, simple-git, @anthropic-ai/sdk

**Design spec:** `docs/superpowers/specs/2026-04-12-sps-file-system-design.md`

---

### Task 1: Update Types (`@sps/core`)

**Files:**
- Modify: `packages/core/src/types.ts`

- [ ] **Step 1: Write failing test for new types**

Create `packages/core/tests/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type {
  SpsConfig,
  SpecFile,
  SpecRule,
  DraftSpec,
  OrganizeResult,
  ManifestEntry,
  Manifest,
} from "../src/types.js";

describe("SPS types", () => {
  it("SpecFile uses spec identity instead of domain/module", () => {
    const file: SpecFile = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: ["billing"],
      rules: [],
      filePath: "src/checkout/coupons/coupons.sps.yaml",
    };
    expect(file.spec).toBe("checkout/coupons");
    expect(file.touches).toEqual(["billing"]);
    expect(file.category).toBe("business");
  });

  it("SpecRule uses unified title instead of business_title/summary", () => {
    const rule: SpecRule = {
      id: "REQ-CHECKOUT-COUPON-01",
      title: "Customers can use a percentage discount code",
      status: "active",
      category: "business",
      description: "Applies a percentage discount",
      given: "A cart with $100",
      when: "Coupon applied",
      then: "Total becomes $80",
      examples: [],
      edge_cases: [],
      tests: [],
    };
    expect(rule.title).toBe("Customers can use a percentage discount code");
    expect(rule.id).toBe("REQ-CHECKOUT-COUPON-01");
  });

  it("DraftSpec uses spec identity", () => {
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: [],
      rules: [],
    };
    expect(draft.spec).toBe("checkout/coupons");
  });

  it("SpsConfig has no specs_dir", () => {
    const config: SpsConfig = {
      version: 1,
      schema: {
        required_fields: ["spec", "title", "description", "rules"],
        required_rule_fields: ["id", "status", "title", "description", "given", "when", "then"],
        forbidden_rule_fields: ["rule", "summary", "business_title"],
        id_format: "REQ-{DOMAIN}-{MODULE}-{NN}",
      },
      domains: {},
      categories: [],
      llm: { provider: "anthropic", model: "claude-sonnet-4-6" },
      git: { branch_prefix: "spec/", commit_prefix: "feat(spec):", create_pr: true, pr_platform: "github" },
      dedup: { enabled: true, similarity_threshold: 0.7 },
    };
    expect(config.version).toBe(1);
    expect("specs_dir" in config).toBe(false);
  });

  it("ManifestEntry captures spec summary for the manifest", () => {
    const entry: ManifestEntry = {
      path: "src/checkout/coupons.sps.yaml",
      spec: "checkout/coupons",
      title: "Discount Codes",
      categories: ["business"],
      rule_count: 3,
      touches: ["billing"],
      status_summary: { active: 3 },
    };
    expect(entry.path).toBe("src/checkout/coupons.sps.yaml");
  });

  it("Manifest has totals and cross_references", () => {
    const manifest: Manifest = {
      generated_at: "2026-04-12T16:00:00Z",
      specs: [],
      totals: { files: 0, rules: 0, by_category: {}, by_status: {} },
      cross_references: {},
      drift: [],
    };
    expect(manifest.generated_at).toBeDefined();
    expect(manifest.totals.files).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run tests/types.test.ts`
Expected: FAIL — types don't exist yet

- [ ] **Step 3: Rewrite types.ts with the new SPS schema**

Replace `packages/core/src/types.ts` entirely:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run tests/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/tests/types.test.ts
git commit -m "feat: rewrite types for SPS schema — spec identity, unified title, manifest types"
```

---

### Task 2: Update Config (`@sps/core`)

**Files:**
- Modify: `packages/core/src/config.ts`
- Modify: `packages/core/tests/config.test.ts`

- [ ] **Step 1: Rewrite config.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { loadConfig, DEFAULT_CONFIG } from "../src/config.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadConfig", () => {
  it("returns default config when no .sps directory exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    const config = loadConfig(dir);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("default config has no specs_dir", () => {
    expect("specs_dir" in DEFAULT_CONFIG).toBe(false);
  });

  it("default config requires new field names", () => {
    expect(DEFAULT_CONFIG.schema.required_fields).toContain("spec");
    expect(DEFAULT_CONFIG.schema.required_fields).toContain("title");
    expect(DEFAULT_CONFIG.schema.required_fields).not.toContain("domain");
    expect(DEFAULT_CONFIG.schema.required_fields).not.toContain("module");
  });

  it("default config forbids old field names", () => {
    expect(DEFAULT_CONFIG.schema.forbidden_rule_fields).toContain("summary");
    expect(DEFAULT_CONFIG.schema.forbidden_rule_fields).toContain("business_title");
  });

  it("loads and merges config from .sps/config.yaml", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, ".sps"));
    writeFileSync(
      join(dir, ".sps/config.yaml"),
      `version: 1\ndomains:\n  billing: BIL\n`
    );
    const config = loadConfig(dir);
    expect(config.domains.billing).toBe("BIL");
    expect(config.schema.required_fields).toEqual(
      DEFAULT_CONFIG.schema.required_fields
    );
  });

  it("deep merges schema overrides", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, ".sps"));
    writeFileSync(
      join(dir, ".sps/config.yaml"),
      `version: 1\nschema:\n  forbidden_rule_fields: [rule, name, summary, business_title]\n`
    );
    const config = loadConfig(dir);
    expect(config.schema.forbidden_rule_fields).toEqual(["rule", "name", "summary", "business_title"]);
    expect(config.schema.required_rule_fields).toEqual(
      DEFAULT_CONFIG.schema.required_rule_fields
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run tests/config.test.ts`
Expected: FAIL — config still uses old schema

- [ ] **Step 3: Rewrite config.ts**

```typescript
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import type { SpsConfig } from "./types.js";

export const DEFAULT_CONFIG: SpsConfig = {
  version: 1,
  schema: {
    required_fields: ["spec", "title", "description", "rules"],
    required_rule_fields: [
      "id",
      "status",
      "title",
      "description",
      "given",
      "when",
      "then",
    ],
    forbidden_rule_fields: ["rule", "summary", "business_title"],
    id_format: "REQ-{DOMAIN}-{MODULE}-{NN}",
  },
  domains: {},
  categories: [
    {
      id: "business",
      label: "Business",
      description: "Affects users, revenue, or growth",
      color: "#00E5A0",
    },
    {
      id: "engineering",
      label: "Engineering",
      description: "System correctness, reliability, maintainability",
      color: "#4B9EFF",
    },
    {
      id: "security",
      label: "Security",
      description: "Data protection, abuse prevention, compliance",
      color: "#FF4B4B",
    },
  ],
  llm: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
  },
  git: {
    branch_prefix: "spec/",
    commit_prefix: "feat(spec):",
    create_pr: true,
    pr_platform: "github",
  },
  dedup: {
    enabled: true,
    similarity_threshold: 0.7,
  },
};

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function loadConfig(repoRoot: string): SpsConfig {
  const configPath = join(repoRoot, ".sps", "config.yaml");
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const content = readFileSync(configPath, "utf-8");
  const userConfig = parse(content) as Record<string, unknown>;

  return deepMerge(
    DEFAULT_CONFIG as unknown as Record<string, unknown>,
    userConfig
  ) as unknown as SpsConfig;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run tests/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/config.ts packages/core/tests/config.test.ts
git commit -m "feat: update config for SPS — .sps/ directory, new schema defaults"
```

---

### Task 3: Update Schema Validation (`@sps/core`)

**Files:**
- Modify: `packages/core/src/schema.ts`
- Modify: `packages/core/tests/schema.test.ts`

- [ ] **Step 1: Rewrite schema.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { validateSpec } from "../src/schema.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const validRule = {
  id: "REQ-CHECKOUT-COUPON-01",
  title: "Customers can use a percentage discount code",
  status: "active" as const,
  category: "business",
  description: "Applies a percentage discount",
  given: "A customer has a $100 cart",
  when: "Coupon applied",
  then: "Cart becomes $80",
  examples: [],
  edge_cases: [],
  tests: [],
};

describe("validateSpec", () => {
  it("returns no errors for a valid spec", () => {
    const spec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: [],
      rules: [validRule],
      filePath: "src/checkout/coupons.sps.yaml",
    };
    const errors = validateSpec(spec, DEFAULT_CONFIG.schema);
    expect(errors).toEqual([]);
  });

  it("reports missing top-level fields", () => {
    const spec = { rules: [validRule], filePath: "test.yaml" } as any;
    const errors = validateSpec(spec, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('"spec"'))).toBe(true);
    expect(errors.some((e: string) => e.includes('"title"'))).toBe(true);
  });

  it("reports missing rule fields", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ id: "REQ-TEST-01", status: "active", title: "No given/when/then" }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('"given"'))).toBe(true);
    expect(errors.some((e: string) => e.includes('"when"'))).toBe(true);
    expect(errors.some((e: string) => e.includes('"then"'))).toBe(true);
  });

  it("reports forbidden rule fields — summary", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ ...validRule, summary: "Old field" }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('forbidden field "summary"'))).toBe(true);
  });

  it("reports forbidden rule fields — business_title", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ ...validRule, business_title: "Old field" }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('forbidden field "business_title"'))).toBe(true);
  });

  it("reports invalid status", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ ...validRule, status: "invalid" }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('"status"'))).toBe(true);
  });

  it("reports invalid category when categories are provided", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ ...validRule, category: "nonexistent" }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec, DEFAULT_CONFIG.schema, DEFAULT_CONFIG.categories);
    expect(errors.some((e: string) => e.includes('"category" must be one of'))).toBe(true);
  });

  it("validates given/when/then are strings not arrays", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ ...validRule, given: ["step1", "step2"] }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('"given" must be a string'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run tests/schema.test.ts`
Expected: FAIL

- [ ] **Step 3: Update schema.ts**

```typescript
import type { SpecFile, SchemaConfig, CategoryConfig } from "./types.js";

export function validateSpec(
  spec: SpecFile,
  schema: SchemaConfig,
  categories?: CategoryConfig[]
): string[] {
  const errors: string[] = [];
  const parsed = spec as unknown as Record<string, unknown>;

  for (const key of schema.required_fields) {
    if (!(key in parsed)) {
      errors.push(`Missing required top-level key "${key}".`);
    }
  }

  const rules = parsed.rules;
  if (!Array.isArray(rules)) {
    errors.push('"rules" must be an array.');
    return errors;
  }

  const validCategoryIds = categories
    ? new Set(categories.map((c) => c.id))
    : null;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i] as Record<string, unknown>;
    const prefix = `rules[${i}]`;

    if (!rule || typeof rule !== "object") {
      errors.push(`${prefix}: must be an object.`);
      continue;
    }

    for (const field of schema.forbidden_rule_fields) {
      if (field in rule) {
        errors.push(
          `${prefix}: forbidden field "${field}". Use "title" instead.`
        );
      }
    }

    for (const field of schema.required_rule_fields) {
      if (!(field in rule)) {
        errors.push(`${prefix}: missing required field "${field}".`);
      }
    }

    if (
      rule.status &&
      !["active", "proposed", "deprecated"].includes(rule.status as string)
    ) {
      errors.push(
        `${prefix}: "status" must be "active", "proposed", or "deprecated".`
      );
    }

    if ("category" in rule && validCategoryIds) {
      if (
        typeof rule.category !== "string" ||
        !validCategoryIds.has(rule.category)
      ) {
        errors.push(
          `${prefix}: "category" must be one of: ${[...validCategoryIds].join(", ")}. Found: "${rule.category}"`
        );
      }
    }

    for (const field of ["given", "when", "then"]) {
      if (field in rule && Array.isArray(rule[field])) {
        errors.push(
          `${prefix}: "${field}" must be a string, not an array.`
        );
      }
    }
  }

  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run tests/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/schema.ts packages/core/tests/schema.test.ts
git commit -m "feat: update schema validation for SPS — spec/title fields, forbid old fields"
```

---

### Task 4: Update Loader for Glob Discovery (`@sps/core`)

**Files:**
- Modify: `packages/core/src/loader.ts`
- Modify: `packages/core/tests/loader.test.ts`

- [ ] **Step 1: Rewrite loader.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { loadSpecs } from "../src/loader.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadSpecs", () => {
  it("returns empty array when no .sps.yaml files exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    const specs = loadSpecs(dir);
    expect(specs).toEqual([]);
  });

  it("discovers .sps.yaml files from nested directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "src/checkout/coupons"), { recursive: true });
    writeFileSync(
      join(dir, "src/checkout/coupons/coupons.sps.yaml"),
      `spec: checkout/coupons\ntitle: Discount Codes\ndescription: Coupon support\ncategory: business\ntouches: []\nrules:\n  - id: REQ-CHECKOUT-COUPON-01\n    title: "Apply coupon"\n    status: active\n    category: business\n    description: "Applies coupon"\n    given: "A cart"\n    when: "Coupon applied"\n    then: "Discount shown"\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );
    const specs = loadSpecs(dir);
    expect(specs).toHaveLength(1);
    expect(specs[0].spec).toBe("checkout/coupons");
    expect(specs[0].title).toBe("Discount Codes");
    expect(specs[0].rules[0].id).toBe("REQ-CHECKOUT-COUPON-01");
    expect(specs[0].filePath).toBe("src/checkout/coupons/coupons.sps.yaml");
  });

  it("skips node_modules and .git directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "node_modules/pkg"), { recursive: true });
    writeFileSync(
      join(dir, "node_modules/pkg/something.sps.yaml"),
      `spec: pkg/something\ntitle: Should be skipped\ndescription: X\ncategory: business\ntouches: []\nrules: []\n`
    );
    const specs = loadSpecs(dir);
    expect(specs).toEqual([]);
  });

  it("discovers multiple .sps.yaml files across directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "src/checkout"), { recursive: true });
    mkdirSync(join(dir, "src/billing"), { recursive: true });
    writeFileSync(
      join(dir, "src/checkout/checkout.sps.yaml"),
      `spec: checkout\ntitle: Checkout\ndescription: Checkout flow\ncategory: business\ntouches: []\nrules:\n  - id: REQ-CHECKOUT-01\n    title: "Cart checkout"\n    status: active\n    category: business\n    description: "Check out"\n    given: "A cart"\n    when: "Checkout"\n    then: "Order placed"\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );
    writeFileSync(
      join(dir, "src/billing/billing.sps.yaml"),
      `spec: billing\ntitle: Billing\ndescription: Billing\ncategory: business\ntouches: []\nrules:\n  - id: REQ-BIL-01\n    title: "Create invoice"\n    status: active\n    category: business\n    description: "Invoice"\n    given: "A user"\n    when: "Request"\n    then: "Invoice created"\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );
    const specs = loadSpecs(dir);
    expect(specs).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run tests/loader.test.ts`
Expected: FAIL — `loadSpecs` still requires `specsDir` argument

- [ ] **Step 3: Rewrite loader.ts**

```typescript
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { parse } from "yaml";
import type { SpecFile } from "./types.js";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".sps",
]);

function findSpsFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...findSpsFiles(fullPath));
      } else if (entry.endsWith(".sps.yaml")) {
        files.push(fullPath);
      }
    }
  } catch {
    // directory may not exist
  }
  return files;
}

export function loadSpecs(repoRoot: string): SpecFile[] {
  const files = findSpsFiles(repoRoot);
  return files
    .map((filePath) => {
      const content = readFileSync(filePath, "utf-8");
      const parsed = parse(content);
      if (!parsed || !parsed.rules) return null;
      return {
        ...parsed,
        filePath: relative(repoRoot, filePath),
      } as SpecFile;
    })
    .filter((s): s is SpecFile => s !== null);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run tests/loader.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/loader.ts packages/core/tests/loader.test.ts
git commit -m "feat: loader discovers co-located .sps.yaml files via glob walk"
```

---

### Task 5: Add Scanner / Manifest Builder (`@sps/core`)

**Files:**
- Create: `packages/core/src/scan.ts`
- Create: `packages/core/tests/scan.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/scan.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildManifest } from "../src/scan.js";
import type { SpecFile, SpsConfig } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const config: SpsConfig = {
  ...DEFAULT_CONFIG,
  domains: { checkout: "CHECKOUT", billing: "BIL" },
};

const makeRule = (id: string, status: string, category: string) => ({
  id,
  title: "Test rule",
  status: status as "active" | "proposed" | "deprecated",
  category,
  description: "A rule",
  given: "Given",
  when: "When",
  then: "Then",
  examples: [],
  edge_cases: [],
  tests: [],
});

describe("buildManifest", () => {
  it("builds manifest from spec files", () => {
    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Coupons",
        category: "business",
        touches: ["billing"],
        rules: [
          makeRule("REQ-CHECKOUT-COUPON-01", "active", "business"),
          makeRule("REQ-CHECKOUT-COUPON-02", "proposed", "business"),
        ],
        filePath: "src/checkout/coupons/coupons.sps.yaml",
      },
    ];

    const manifest = buildManifest(specs, config);

    expect(manifest.specs).toHaveLength(1);
    expect(manifest.specs[0].spec).toBe("checkout/coupons");
    expect(manifest.specs[0].rule_count).toBe(2);
    expect(manifest.specs[0].status_summary).toEqual({ active: 1, proposed: 1 });
    expect(manifest.specs[0].categories).toEqual(["business"]);
    expect(manifest.specs[0].touches).toEqual(["billing"]);
    expect(manifest.totals.files).toBe(1);
    expect(manifest.totals.rules).toBe(2);
    expect(manifest.totals.by_category).toEqual({ business: 2 });
    expect(manifest.totals.by_status).toEqual({ active: 1, proposed: 1 });
    expect(manifest.generated_at).toBeDefined();
  });

  it("builds cross-reference reverse index from touches", () => {
    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Coupons",
        category: "business",
        touches: ["billing", "notifications"],
        rules: [
          makeRule("REQ-CHECKOUT-COUPON-01", "active", "business"),
        ],
        filePath: "src/checkout/coupons/coupons.sps.yaml",
      },
    ];

    const manifest = buildManifest(specs, config);

    expect(manifest.cross_references.billing).toBeDefined();
    expect(manifest.cross_references.billing.touched_by).toHaveLength(1);
    expect(manifest.cross_references.billing.touched_by[0].spec).toBe("checkout/coupons");
    expect(manifest.cross_references.notifications).toBeDefined();
  });

  it("detects drift between file path and declared spec", () => {
    const specs: SpecFile[] = [
      {
        spec: "billing",
        title: "Billing",
        description: "Billing",
        category: "business",
        touches: [],
        rules: [],
        filePath: "src/payments/billing.sps.yaml",
      },
    ];

    const manifest = buildManifest(specs, config);

    expect(manifest.drift).toHaveLength(1);
    expect(manifest.drift[0].path).toBe("src/payments/billing.sps.yaml");
    expect(manifest.drift[0].issue).toContain("billing");
  });

  it("returns empty manifest for no specs", () => {
    const manifest = buildManifest([], config);
    expect(manifest.specs).toEqual([]);
    expect(manifest.totals.files).toBe(0);
    expect(manifest.totals.rules).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run tests/scan.test.ts`
Expected: FAIL — `scan.ts` doesn't exist

- [ ] **Step 3: Implement scan.ts**

```typescript
import type { SpecFile, SpsConfig, Manifest } from "./types.js";

export function buildManifest(specs: SpecFile[], _config: SpsConfig): Manifest {
  const entries = specs.map((spec) => {
    const statusCounts: Record<string, number> = {};
    const categoriesSet = new Set<string>();

    for (const rule of spec.rules) {
      statusCounts[rule.status] = (statusCounts[rule.status] || 0) + 1;
      categoriesSet.add(rule.category);
    }

    return {
      path: spec.filePath,
      spec: spec.spec,
      title: spec.title,
      categories: [...categoriesSet],
      rule_count: spec.rules.length,
      touches: spec.touches || [],
      status_summary: statusCounts,
    };
  });

  // Totals
  let totalRules = 0;
  const byCat: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const entry of entries) {
    totalRules += entry.rule_count;
    for (const cat of entry.categories) {
      // Count rules per category from the source specs
      const spec = specs.find((s) => s.filePath === entry.path)!;
      const catCount = spec.rules.filter((r) => r.category === cat).length;
      byCat[cat] = (byCat[cat] || 0) + catCount;
    }
    for (const [status, count] of Object.entries(entry.status_summary)) {
      byStatus[status] = (byStatus[status] || 0) + count;
    }
  }

  // Cross-references
  const crossRefs: Manifest["cross_references"] = {};
  for (const spec of specs) {
    for (const touched of spec.touches || []) {
      if (!crossRefs[touched]) {
        crossRefs[touched] = { touched_by: [] };
      }
      crossRefs[touched].touched_by.push({
        spec: spec.spec,
        path: spec.filePath,
        rules: spec.rules.filter((r) => r.id).map((r) => r.id!),
      });
    }
  }

  // Drift detection — check if file path contains the spec identity
  const drift: Manifest["drift"] = [];
  for (const spec of specs) {
    const specParts = spec.spec.split("/");
    const pathLower = spec.filePath.toLowerCase();
    const lastPart = specParts[specParts.length - 1];
    if (!pathLower.includes(lastPart)) {
      drift.push({
        path: spec.filePath,
        issue: `declared spec '${spec.spec}' but file path '${spec.filePath}' does not contain '${lastPart}'`,
      });
    }
  }

  return {
    generated_at: new Date().toISOString(),
    specs: entries,
    totals: {
      files: entries.length,
      rules: totalRules,
      by_category: byCat,
      by_status: byStatus,
    },
    cross_references: crossRefs,
    drift,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run tests/scan.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/scan.ts packages/core/tests/scan.test.ts
git commit -m "feat: add manifest builder — cross-references, drift detection, totals"
```

---

### Task 6: Update Interpret (`@sps/core`)

**Files:**
- Modify: `packages/core/src/interpret.ts`
- Modify: `packages/core/tests/interpret.test.ts`

- [ ] **Step 1: Rewrite interpret.test.ts**

```typescript
import { describe, it, expect, vi } from "vitest";
import { interpret } from "../src/interpret.js";
import type { SpecFile } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              spec: "checkout/coupons",
              title: "Discount Codes",
              description: "Coupon discount support for checkout",
              category: "business",
              touches: ["billing"],
              rules: [
                {
                  id: null,
                  title: "Percentage coupon reduces cart total",
                  status: "proposed",
                  category: "business",
                  description: "Applies a percentage discount to the cart subtotal",
                  given: "A customer has a $100 cart and enters SAVE20",
                  when: "The coupon is applied at checkout",
                  then: "The cart total becomes $80",
                  examples: [
                    {
                      input: { cart_cents: 10000 },
                      output: { total_cents: 8000 },
                    },
                  ],
                  edge_cases: [],
                  tests: [],
                },
              ],
            }),
          },
        ],
      }),
    };
  },
}));

describe("interpret", () => {
  it("returns a draft spec with SPS schema from natural language", async () => {
    const result = await interpret(
      "We need discount codes at checkout",
      [],
      DEFAULT_CONFIG
    );
    expect(result.spec).toBe("checkout/coupons");
    expect(result.title).toBe("Discount Codes");
    expect(result.category).toBe("business");
    expect(result.touches).toEqual(["billing"]);
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].title).toBe("Percentage coupon reduces cart total");
    expect(result.rules[0].given).toContain("$100");
  });

  it("passes existing specs as context without crashing", async () => {
    const existing: SpecFile[] = [
      {
        spec: "checkout/validation",
        title: "Checkout Validation",
        description: "Checkout validation",
        category: "engineering",
        touches: [],
        rules: [
          {
            id: "REQ-CHECKOUT-VAL-01",
            title: "Cart must have items",
            status: "active",
            category: "engineering",
            description: "Cannot checkout with empty cart",
            given: "An empty cart",
            when: "User clicks checkout",
            then: "Error shown",
            examples: [],
            edge_cases: [],
            tests: [],
          },
        ],
        filePath: "src/checkout/checkout.sps.yaml",
      },
    ];

    const result = await interpret(
      "We need discount codes",
      existing,
      DEFAULT_CONFIG
    );
    expect(result.spec).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run tests/interpret.test.ts`
Expected: FAIL

- [ ] **Step 3: Rewrite interpret.ts**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { DraftSpec, SpecFile, SpsConfig } from "./types.js";

function buildSystemPrompt(
  config: SpsConfig,
  existingSpecs: SpecFile[]
): string {
  const specSummaries = existingSpecs
    .flatMap((s) =>
      s.rules.map(
        (r) => `${r.id}: ${r.title} (${s.spec})`
      )
    )
    .join("\n");

  return `You are a requirements analyst. Your job is to convert natural language feature descriptions into structured spec JSON.

Output a JSON object with this exact structure:
{
  "spec": "domain/module",
  "title": "Human-readable name for this spec",
  "description": "Plain English description for business stakeholders",
  "category": "business|engineering|security",
  "touches": ["other-domain-this-affects"],
  "rules": [
    {
      "id": null,
      "title": "One-line readable title for this rule",
      "status": "proposed",
      "category": "business|engineering|security",
      "description": "Detailed explanation a product manager can read",
      "given": "Preconditions with concrete values ($50 stake, 24 hours before, etc.)",
      "when": "The trigger action",
      "then": "The expected outcome with concrete values",
      "examples": [{"input": {}, "output": {}}],
      "edge_cases": [{"case": "description", "decision": "what happens"}],
      "tests": []
    }
  ]
}

Rules for writing specs:
- Write title, description, given, when, then in plain English — no code, no function names
- Use real dollar amounts, time ranges, and concrete user actions
- Each rule should be independently testable
- Break complex features into multiple rules (one behavior per rule)
- Monetary values in examples use cents (integer)
- The "spec" field uses "domain/module" format, all lowercase
- The "touches" field lists other domains this spec affects beyond its own

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run tests/interpret.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/interpret.ts packages/core/tests/interpret.test.ts
git commit -m "feat: update interpret for SPS schema — spec identity, title, touches, category"
```

---

### Task 7: Update Deduplicate (`@sps/core`)

**Files:**
- Modify: `packages/core/src/deduplicate.ts`
- Modify: `packages/core/tests/deduplicate.test.ts`

- [ ] **Step 1: Rewrite deduplicate.test.ts**

```typescript
import { describe, it, expect, vi } from "vitest";
import { deduplicate } from "../src/deduplicate.js";
import type { DraftSpec, SpecFile } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              matches: [
                {
                  existing_rule_id: "REQ-PAY-CHECKOUT-03",
                  draft_rule_index: 0,
                  relationship: "extends",
                  confidence: 0.85,
                  explanation: "Both deal with checkout modifications",
                },
              ],
            }),
          },
        ],
      }),
    };
  },
}));

const makeRule = (overrides = {}) => ({
  id: null,
  title: "Apply coupon",
  status: "proposed" as const,
  category: "business",
  description: "",
  given: "",
  when: "",
  then: "",
  examples: [],
  edge_cases: [],
  tests: [],
  ...overrides,
});

describe("deduplicate", () => {
  it("returns empty matches when no existing specs", async () => {
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupons",
      category: "business",
      touches: [],
      rules: [makeRule()],
    };
    const result = await deduplicate(draft, [], DEFAULT_CONFIG);
    expect(result.matches).toEqual([]);
  });

  it("finds matches against existing specs via LLM", async () => {
    const existing: SpecFile[] = [
      {
        spec: "payments/checkout",
        title: "Checkout Flow",
        description: "Checkout flow",
        category: "business",
        touches: [],
        rules: [
          makeRule({
            id: "REQ-PAY-CHECKOUT-03",
            status: "active",
            title: "Validate cart before payment",
          }),
        ],
        filePath: "src/payments/checkout.sps.yaml",
      },
    ];
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupons",
      category: "business",
      touches: [],
      rules: [makeRule({ title: "Apply coupon at checkout" })],
    };
    const result = await deduplicate(draft, existing, DEFAULT_CONFIG);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].relationship).toBe("extends");
    expect(result.matches[0].existingRule.id).toBe("REQ-PAY-CHECKOUT-03");
    expect(result.matches[0].confidence).toBe(0.85);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run tests/deduplicate.test.ts`
Expected: FAIL

- [ ] **Step 3: Rewrite deduplicate.ts**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run tests/deduplicate.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/deduplicate.ts packages/core/tests/deduplicate.test.ts
git commit -m "feat: update deduplicate for SPS schema — spec identity, title field"
```

---

### Task 8: Update Organize (`@sps/core`)

**Files:**
- Modify: `packages/core/src/organize.ts`
- Modify: `packages/core/tests/organize.test.ts`

- [ ] **Step 1: Rewrite organize.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { organize } from "../src/organize.js";
import type { DraftSpec, SpecFile, SpsConfig } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const config: SpsConfig = {
  ...DEFAULT_CONFIG,
  domains: { checkout: "CHECKOUT", billing: "BIL" },
};

const makeRule = (overrides = {}) => ({
  id: null,
  title: "Rule",
  status: "proposed" as const,
  category: "business",
  description: "",
  given: "",
  when: "",
  then: "",
  examples: [],
  edge_cases: [],
  tests: [],
  ...overrides,
});

describe("organize", () => {
  it("generates co-located file path from spec identity", () => {
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: [],
      rules: [makeRule({ title: "Apply coupon" })],
    };
    const result = organize(draft, [], config);
    expect(result.filePath).toBe("src/checkout/coupons/coupons.sps.yaml");
    expect(result.isNewFile).toBe(true);
    expect(result.spec).toBe("checkout/coupons");
  });

  it("generates path for single-level spec", () => {
    const draft: DraftSpec = {
      spec: "billing",
      title: "Billing",
      description: "Billing",
      category: "business",
      touches: [],
      rules: [makeRule()],
    };
    const result = organize(draft, [], config);
    expect(result.filePath).toBe("src/billing/billing.sps.yaml");
  });

  it("assigns lineage IDs sequentially starting from 01", () => {
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: [],
      rules: [
        makeRule({ title: "Rule 1" }),
        makeRule({ title: "Rule 2" }),
      ],
    };
    const result = organize(draft, [], config);
    expect(result.assignedIds.get(0)).toBe("REQ-CHECKOUT-COUPONS-01");
    expect(result.assignedIds.get(1)).toBe("REQ-CHECKOUT-COUPONS-02");
  });

  it("continues numbering from existing specs", () => {
    const existing: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Existing",
        category: "business",
        touches: [],
        rules: [
          makeRule({ id: "REQ-CHECKOUT-COUPONS-01", status: "active", title: "Existing rule" }),
          makeRule({ id: "REQ-CHECKOUT-COUPONS-02", status: "active", title: "Another" }),
        ],
        filePath: "src/checkout/coupons/coupons.sps.yaml",
      },
    ];
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: [],
      rules: [makeRule({ title: "New rule" })],
    };
    const result = organize(draft, existing, config);
    expect(result.assignedIds.get(0)).toBe("REQ-CHECKOUT-COUPONS-03");
    expect(result.isNewFile).toBe(false);
  });

  it("uses domain abbreviation from config when available", () => {
    const draft: DraftSpec = {
      spec: "billing/invoices",
      title: "Invoices",
      description: "Invoices",
      category: "business",
      touches: [],
      rules: [makeRule()],
    };
    const result = organize(draft, [], config);
    expect(result.assignedIds.get(0)).toBe("REQ-BIL-INVOICES-01");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run tests/organize.test.ts`
Expected: FAIL

- [ ] **Step 3: Rewrite organize.ts**

```typescript
import type {
  DraftSpec,
  SpecFile,
  SpsConfig,
  OrganizeResult,
} from "./types.js";

export function organize(
  draft: DraftSpec,
  existingSpecs: SpecFile[],
  config: SpsConfig
): OrganizeResult {
  // Parse spec identity: "checkout/coupons" → domain="checkout", module="coupons"
  const parts = draft.spec.split("/");
  const domain = parts[0];
  const module = parts.length > 1 ? parts[parts.length - 1] : domain;

  // Generate co-located file path
  const specPath = parts.join("/");
  const filePath = `src/${specPath}/${module}.sps.yaml`;

  const existingFile = existingSpecs.find((s) => s.spec === draft.spec);
  const isNewFile = !existingFile;

  // Generate lineage IDs
  const domainAbbrev =
    config.domains[domain]?.toUpperCase() || domain.toUpperCase();
  const moduleAbbrev = module.toUpperCase();
  const idPrefix = `REQ-${domainAbbrev}-${moduleAbbrev}-`;

  let maxId = 0;
  for (const spec of existingSpecs) {
    for (const rule of spec.rules) {
      if (rule.id && rule.id.startsWith(idPrefix)) {
        const num = parseInt(rule.id.slice(idPrefix.length), 10);
        if (num > maxId) maxId = num;
      }
    }
  }

  const assignedIds = new Map<number, string>();
  let nextId = maxId + 1;
  for (let i = 0; i < draft.rules.length; i++) {
    if (!draft.rules[i].id) {
      assignedIds.set(
        i,
        `${idPrefix}${String(nextId).padStart(2, "0")}`
      );
      nextId++;
    }
  }

  return {
    filePath,
    spec: draft.spec,
    assignedIds,
    isNewFile,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run tests/organize.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/organize.ts packages/core/tests/organize.test.ts
git commit -m "feat: organize generates co-located .sps.yaml paths from spec identity"
```

---

### Task 9: Update Trace and Git (`@sps/core`)

**Files:**
- Modify: `packages/core/src/trace.ts` (minimal — just type rename)
- Modify: `packages/core/tests/trace.test.ts` (no behavior change)
- Modify: `packages/core/src/git.ts` (update branding)
- Modify: `packages/core/tests/git.test.ts` (update expected strings)

- [ ] **Step 1: Update trace.ts — change import**

The trace module only needs its type import updated. Replace the import line:

In `packages/core/src/trace.ts`, no functional changes needed — the `TraceBlock`, `SubmissionContext`, and `TraceHistoryEntry` types keep the same shape. Only verify the import works with the renamed types file.

- [ ] **Step 2: Update git.ts — rename branding**

In `packages/core/src/git.ts`, change the import and the PR description footer:

```typescript
import { simpleGit } from "simple-git";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { SpsConfig, TraceBlock } from "./types.js";

export async function createSpecBranch(
  repoRoot: string,
  filePath: string,
  content: string,
  config: SpsConfig,
  slug: string
): Promise<{ branch: string }> {
  const git = simpleGit(repoRoot);
  const branch = `${config.git.branch_prefix}${slug}`;

  await git.checkoutLocalBranch(branch);

  const fullPath = join(repoRoot, filePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");

  await git.add(filePath);
  await git.commit(`${config.git.commit_prefix} add ${filePath}`);

  if (config.git.create_pr) {
    await git.push("origin", branch, ["--set-upstream"]);
  }

  return { branch };
}

export function buildPrDescription(
  trace: TraceBlock,
  specName: string,
  ruleCount: number
): string {
  return `## New Spec: ${specName}

**${ruleCount} rules** generated from a requirement submission.

### Requirement
> ${trace.original_text}

### Traceability
| Field | Value |
|-------|-------|
| Requested by | ${trace.requested_by} |
| Submitted via | ${trace.source} |
| Interpreted by | ${trace.interpretation_model} |
| Submitted at | ${trace.requested_at} |

### Related Specs
${trace.related_specs.length === 0 ? "None found." : trace.related_specs.map((r) => `- ${r.id} (${r.relationship}): ${r.note}`).join("\n")}

---
*Generated by [SPS](https://github.com/sps/sps) — Spec, Plan, Ship*`;
}
```

- [ ] **Step 3: Update git.test.ts**

In `packages/core/tests/git.test.ts`, change the import and update expected strings:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSpecBranch, buildPrDescription } from "../src/git.js";
import type { TraceBlock } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const mockGit = {
  checkoutLocalBranch: vi.fn(),
  add: vi.fn(),
  commit: vi.fn(),
  push: vi.fn(),
};
vi.mock("simple-git", () => ({
  simpleGit: () => mockGit,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSpecBranch", () => {
  it("creates a branch with the configured prefix", async () => {
    await createSpecBranch(
      "/tmp/repo",
      "src/checkout/coupons/coupons.sps.yaml",
      "spec: checkout/coupons\n",
      DEFAULT_CONFIG,
      "coupon-support"
    );

    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith(
      "spec/coupon-support"
    );
    expect(mockGit.add).toHaveBeenCalledWith(
      "src/checkout/coupons/coupons.sps.yaml"
    );
    expect(mockGit.commit).toHaveBeenCalledWith(
      expect.stringContaining("feat(spec):")
    );
  });

  it("pushes to remote when create_pr is true", async () => {
    await createSpecBranch(
      "/tmp/repo",
      "src/checkout/coupons/coupons.sps.yaml",
      "content",
      DEFAULT_CONFIG,
      "coupon-support"
    );

    expect(mockGit.push).toHaveBeenCalledWith(
      "origin",
      "spec/coupon-support",
      ["--set-upstream"]
    );
  });
});

describe("buildPrDescription", () => {
  it("includes traceability info in PR description", () => {
    const trace: TraceBlock = {
      requested_by: "sarah@company.com",
      requested_at: "2026-04-12T14:30:00Z",
      original_text: "We need discount codes",
      interpretation_model: "claude-sonnet-4-6",
      interpretation_at: "2026-04-12T14:30:05Z",
      reviewed_by: "sarah@company.com",
      reviewed_at: "2026-04-12T14:31:00Z",
      source: "portal",
      related_specs: [],
      history: [],
    };

    const desc = buildPrDescription(trace, "checkout/coupons", 3);
    expect(desc).toContain("sarah@company.com");
    expect(desc).toContain("We need discount codes");
    expect(desc).toContain("3 rules");
    expect(desc).toContain("portal");
    expect(desc).toContain("SPS");
  });
});
```

- [ ] **Step 4: Run all trace and git tests**

Run: `cd packages/core && npx vitest run tests/trace.test.ts tests/git.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/trace.ts packages/core/src/git.ts packages/core/tests/trace.test.ts packages/core/tests/git.test.ts
git commit -m "feat: update trace and git modules for SPS types and branding"
```

---

### Task 10: Update Pipeline (`@sps/core`)

**Files:**
- Modify: `packages/core/src/pipeline.ts`
- Modify: `packages/core/tests/pipeline.test.ts`

- [ ] **Step 1: Rewrite pipeline.test.ts**

```typescript
import { describe, it, expect, vi } from "vitest";
import { submitRequirement } from "../src/pipeline.js";

vi.mock("../src/interpret.js", () => ({
  interpret: vi.fn().mockResolvedValue({
    spec: "checkout/coupons",
    title: "Discount Codes",
    description: "Coupon support",
    category: "business",
    touches: [],
    rules: [
      {
        id: null,
        title: "Apply coupon",
        status: "proposed",
        category: "business",
        description: "Applies coupon",
        given: "A cart",
        when: "Coupon applied",
        then: "Discount shown",
        examples: [],
        edge_cases: [],
        tests: [],
      },
    ],
  }),
}));

vi.mock("../src/deduplicate.js", () => ({
  deduplicate: vi.fn().mockResolvedValue({ matches: [] }),
}));

vi.mock("../src/git.js", () => ({
  createSpecBranch: vi
    .fn()
    .mockResolvedValue({ branch: "spec/coupon-support" }),
  buildPrDescription: vi.fn().mockReturnValue("PR description"),
}));

vi.mock("../src/loader.js", () => ({
  loadSpecs: vi.fn().mockReturnValue([]),
}));

describe("submitRequirement", () => {
  it("runs the full pipeline: interpret → deduplicate → organize → trace → git", async () => {
    const { interpret } = await import("../src/interpret.js");
    const { deduplicate } = await import("../src/deduplicate.js");
    const { createSpecBranch } = await import("../src/git.js");

    const result = await submitRequirement("/tmp/repo", {
      text: "We need coupon support",
      submittedBy: "sarah@company.com",
      source: "cli",
      mode: "quick",
    });

    expect(interpret).toHaveBeenCalledOnce();
    expect(deduplicate).toHaveBeenCalledOnce();
    expect(createSpecBranch).toHaveBeenCalledOnce();

    expect(result.filePath).toBe("src/checkout/coupons/coupons.sps.yaml");
    expect(result.branch).toBe("spec/coupon-support");
    expect(result.ruleCount).toBe(1);
    expect(result.deduplication.matches).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run tests/pipeline.test.ts`
Expected: FAIL

- [ ] **Step 3: Rewrite pipeline.ts**

```typescript
import { loadConfig } from "./config.js";
import { loadSpecs } from "./loader.js";
import { interpret } from "./interpret.js";
import { deduplicate } from "./deduplicate.js";
import { organize } from "./organize.js";
import { buildTrace } from "./trace.js";
import { createSpecBranch, buildPrDescription } from "./git.js";
import { validateSpec } from "./schema.js";
import { stringify } from "yaml";
import type {
  SubmissionContext,
  DeduplicationResult,
  SpecFile,
} from "./types.js";

export interface SubmitResult {
  filePath: string;
  branch: string;
  ruleCount: number;
  deduplication: DeduplicationResult;
  specContent: string;
  prDescription: string;
}

export async function submitRequirement(
  repoRoot: string,
  context: SubmissionContext
): Promise<SubmitResult> {
  const config = loadConfig(repoRoot);
  const existingSpecs = loadSpecs(repoRoot);
  const draft = await interpret(context.text, existingSpecs, config);
  const dedup = await deduplicate(draft, existingSpecs, config);
  const organized = organize(draft, existingSpecs, config);

  for (const [index, id] of organized.assignedIds) {
    draft.rules[index].id = id;
    draft.rules[index].status = "active";
  }

  const trace = buildTrace(context, config.llm.model);
  trace.related_specs = dedup.matches.map((m) => ({
    id: m.existingRule.id!,
    relationship: m.relationship,
    note: m.explanation,
  }));

  const specObj: Record<string, unknown> = {
    spec: draft.spec,
    title: draft.title,
    description: draft.description,
    category: draft.category,
    touches: draft.touches,
    rules: draft.rules,
    _trace: trace,
  };

  const specContent = stringify(specObj, { lineWidth: 100 });

  const errors = validateSpec(
    { ...draft, filePath: organized.filePath } as SpecFile,
    config.schema,
    config.categories
  );
  if (errors.length > 0) {
    throw new Error(
      `Generated spec has validation errors:\n${errors.join("\n")}`
    );
  }

  const slug = draft.spec.replace(/\//g, "-").replace(/[^a-z0-9-]/g, "-");
  const { branch } = await createSpecBranch(
    repoRoot,
    organized.filePath,
    specContent,
    config,
    slug
  );

  const prDescription = buildPrDescription(
    trace,
    draft.spec,
    draft.rules.length
  );

  return {
    filePath: organized.filePath,
    branch,
    ruleCount: draft.rules.length,
    deduplication: dedup,
    specContent,
    prDescription,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run tests/pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Run ALL core tests to verify nothing is broken**

Run: `cd packages/core && npx vitest run`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/pipeline.ts packages/core/tests/pipeline.test.ts
git commit -m "feat: update pipeline for SPS — co-located paths, new schema, loadSpecs without specsDir"
```

---

### Task 11: Update Core Barrel Export and Package Rename

**Files:**
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/package.json`

- [ ] **Step 1: Update index.ts**

```typescript
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
```

- [ ] **Step 2: Update package.json**

In `packages/core/package.json`, change `"name": "@specflow/core"` to `"name": "@sps/core"`.

- [ ] **Step 3: Run all core tests**

Run: `cd packages/core && npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/index.ts packages/core/package.json
git commit -m "feat: rename @specflow/core to @sps/core, export scan + new types"
```

---

### Task 12: Update CLI (`@sps/cli`)

**Files:**
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/commands/init.ts`
- Modify: `packages/cli/src/commands/submit.ts`
- Modify: `packages/cli/src/commands/status.ts`
- Modify: `packages/cli/src/commands/validate.ts`
- Create: `packages/cli/src/commands/scan.ts`
- Modify: `packages/cli/package.json`

- [ ] **Step 1: Rewrite CLI init.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";

vi.mock("chalk", () => ({
  default: {
    green: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s,
  },
}));

describe("init command", () => {
  let origCwd: string;

  beforeEach(() => {
    origCwd = process.cwd();
  });

  it("creates .sps/config.yaml only — no specs directory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    process.chdir(dir);

    const { initCommand } = await import("../src/commands/init.js");
    await initCommand();

    expect(existsSync(join(dir, ".sps/config.yaml"))).toBe(true);
    expect(existsSync(join(dir, "specs"))).toBe(false);

    const config = readFileSync(join(dir, ".sps/config.yaml"), "utf-8");
    expect(config).toContain("required_fields");
    expect(config).toContain("anthropic");
    expect(config).not.toContain("specs_dir");

    process.chdir(origCwd);
  });

  it("skips if config already exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    process.chdir(dir);

    const { initCommand } = await import("../src/commands/init.js");
    await initCommand();
    await initCommand();

    process.chdir(origCwd);
  });
});
```

- [ ] **Step 2: Rewrite CLI status.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("chalk", () => ({
  default: {
    green: (s: string | number) => String(s),
    yellow: (s: string | number) => String(s),
    red: (s: string | number) => String(s),
    bold: (s: string) => s,
    dim: (s: string | number) => String(s),
  },
}));

describe("status command", () => {
  let origCwd: string;

  beforeEach(() => {
    origCwd = process.cwd();
  });

  it("reports spec counts from co-located .sps.yaml files", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    mkdirSync(join(dir, "src/billing"), { recursive: true });
    writeFileSync(
      join(dir, "src/billing/billing.sps.yaml"),
      `spec: billing\ntitle: Billing\ndescription: Invoices\ncategory: business\ntouches: []\nrules:\n  - id: REQ-BIL-01\n    title: Create invoice\n    status: active\n    category: business\n    description: Creates invoice\n    given: A user\n    when: Request\n    then: Created\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );

    process.chdir(dir);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));

    const { statusCommand } = await import("../src/commands/status.js");
    await statusCommand({});

    console.log = origLog;
    process.chdir(origCwd);

    const output = logs.join("\n");
    expect(output).toContain("Total rules:");
    expect(output).toContain("1");
    expect(output).toContain("Active:");
  });
});
```

- [ ] **Step 3: Rewrite CLI validate.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("chalk", () => ({
  default: {
    green: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s,
  },
}));

describe("validate command", () => {
  let origCwd: string;

  beforeEach(() => {
    origCwd = process.cwd();
  });

  it("passes for valid .sps.yaml specs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    mkdirSync(join(dir, "src/test"), { recursive: true });
    writeFileSync(
      join(dir, "src/test/test.sps.yaml"),
      `spec: test/mod\ntitle: Test\ndescription: Test\ncategory: business\ntouches: []\nrules:\n  - id: REQ-TEST-01\n    title: Rule\n    status: active\n    category: business\n    description: A rule\n    given: Precondition\n    when: Action\n    then: Outcome\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );

    process.chdir(dir);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));

    const { validateCommand } = await import("../src/commands/validate.js");
    await validateCommand();

    console.log = origLog;
    process.chdir(origCwd);

    expect(logs.join("\n")).toContain("conform to schema");
  });

  it("fails for invalid specs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    mkdirSync(join(dir, "src/test"), { recursive: true });
    writeFileSync(
      join(dir, "src/test/bad.sps.yaml"),
      `spec: test/bad\ntitle: Bad\ndescription: Bad\ncategory: business\ntouches: []\nrules:\n  - id: REQ-TEST-01\n    status: active\n    summary: "Should be title"\n`
    );

    process.chdir(dir);

    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => errors.push(args.join(" "));

    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    const { validateCommand } = await import("../src/commands/validate.js");
    await expect(validateCommand()).rejects.toThrow("process.exit");

    console.error = origError;
    mockExit.mockRestore();
    process.chdir(origCwd);

    expect(errors.join("\n")).toContain("validation failed");
  });
});
```

- [ ] **Step 4: Run CLI tests to verify they fail**

Run: `cd packages/cli && npx vitest run`
Expected: FAIL

- [ ] **Step 5: Rewrite all CLI source files**

**`packages/cli/src/index.ts`:**

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { submitCommand } from "./commands/submit.js";
import { statusCommand } from "./commands/status.js";
import { validateCommand } from "./commands/validate.js";
import { scanCommand } from "./commands/scan.js";

const program = new Command();

program
  .name("sps")
  .description(
    "Spec, Plan, Ship — turn natural language requirements into structured, traceable specs in git"
  )
  .version("0.1.0");

program
  .command("init")
  .description("Initialize SPS in the current repo")
  .action(initCommand);

program
  .command("submit")
  .description("Submit a new requirement")
  .argument("[description]", "Feature description in natural language")
  .option("--guided", "Use guided mode (interactive conversation)")
  .option(
    "--author <email>",
    "Author email",
    process.env.USER || "unknown@sps.dev"
  )
  .action(submitCommand);

program
  .command("status")
  .description("Show spec health report")
  .argument("[dir]", "Optional directory to filter")
  .option("--gaps-only", "Only show gaps")
  .action(statusCommand);

program
  .command("validate")
  .description("Validate all specs against schema")
  .action(validateCommand);

program
  .command("scan")
  .description("Force rebuild the manifest")
  .action(scanCommand);

program.parse();
```

**`packages/cli/src/commands/init.ts`:**

```typescript
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { stringify } from "yaml";
import { DEFAULT_CONFIG } from "@sps/core";
import chalk from "chalk";

export async function initCommand() {
  const repoRoot = process.cwd();
  const configDir = join(repoRoot, ".sps");
  const configPath = join(configDir, "config.yaml");

  if (existsSync(configPath)) {
    console.log(
      chalk.yellow("! .sps/config.yaml already exists. Skipping.")
    );
    return;
  }

  mkdirSync(configDir, { recursive: true });
  const configContent = stringify(DEFAULT_CONFIG, { lineWidth: 80 });
  writeFileSync(configPath, configContent, "utf-8");
  console.log(chalk.green("*"), "Created .sps/config.yaml");

  console.log(
    `\n${chalk.bold("SPS initialized.")} Drop .sps.yaml files next to your code to start writing specs.\nRun ${chalk.dim("sps scan")} to build the manifest.\n`
  );
}
```

**`packages/cli/src/commands/submit.ts`:**

```typescript
import { submitRequirement } from "@sps/core";
import chalk from "chalk";
import { createInterface } from "readline";

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function submitCommand(
  description: string | undefined,
  options: { guided?: boolean; author?: string }
) {
  const repoRoot = process.cwd();
  const author = options.author || process.env.USER || "unknown@sps.dev";

  let text = description;
  if (!text) {
    text = await prompt(
      chalk.bold("Describe the feature you need:\n> ")
    );
    if (!text) {
      console.log(chalk.red("x No description provided."));
      process.exit(1);
    }
  }

  console.log(chalk.dim("\nInterpreting requirement..."));

  try {
    const result = await submitRequirement(repoRoot, {
      text,
      submittedBy: author,
      source: "cli",
      mode: options.guided ? "guided" : "quick",
    });

    if (result.deduplication.matches.length > 0) {
      console.log(
        chalk.yellow(
          `\nFound ${result.deduplication.matches.length} related spec(s):`
        )
      );
      for (const match of result.deduplication.matches) {
        console.log(
          `  ${match.existingRule.id} (${match.existingSpec.spec}) — ${match.relationship}`
        );
        console.log(chalk.dim(`    ${match.explanation}`));
      }
    }

    console.log(chalk.green("\n* Spec created successfully"));
    console.log(`  File:   ${result.filePath}`);
    console.log(`  Branch: ${result.branch}`);
    console.log(`  Rules:  ${result.ruleCount}`);
    console.log("");
  } catch (error) {
    console.error(
      chalk.red("x Failed to create spec:"),
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}
```

**`packages/cli/src/commands/status.ts`:**

```typescript
import { loadConfig, loadSpecs } from "@sps/core";
import chalk from "chalk";

export async function statusCommand(
  dir: string | undefined,
  options: { gapsOnly?: boolean }
) {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  let specs = loadSpecs(repoRoot);

  // Filter by directory if provided
  if (dir) {
    const normalized = dir.replace(/\/$/, "");
    specs = specs.filter((s) => s.filePath.includes(normalized));
  }

  const allRules = specs.flatMap((s) =>
    s.rules.map((r) => ({
      ...r,
      spec: s.spec,
      specFile: s.filePath,
    }))
  );

  const active = allRules.filter((r) => r.status === "active");
  const proposed = allRules.filter((r) => r.status === "proposed");
  const deprecated = allRules.filter((r) => r.status === "deprecated");
  const needsId = active.filter((r) => !r.id);

  if (!options.gapsOnly) {
    console.log("\nSpec Status Report");
    console.log("------------------");
    console.log(`Total rules:     ${allRules.length}`);
    console.log(`Active:          ${chalk.green(active.length)}`);
    console.log(`Proposed:        ${chalk.yellow(proposed.length)}`);
    console.log(`Deprecated:      ${chalk.dim(deprecated.length)}`);
    console.log(`Needs ID:        ${needsId.length > 0 ? chalk.red(needsId.length) : 0}`);
    console.log("");
  }

  if (needsId.length > 0) {
    console.log(chalk.yellow("Rules needing lineage ID (id: null):"));
    for (const r of needsId) {
      console.log(`  ${r.specFile.padEnd(45)} ${r.title}`);
    }
    console.log("");
  }

  if (options.gapsOnly && needsId.length === 0) {
    console.log(chalk.green("No gaps found."));
  }
}
```

**`packages/cli/src/commands/validate.ts`:**

```typescript
import { loadConfig, loadSpecs, validateSpec } from "@sps/core";
import chalk from "chalk";

export async function validateCommand() {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot);

  let totalErrors = 0;
  const failures: Array<{ file: string; errors: string[] }> = [];

  for (const spec of specs) {
    const errors = validateSpec(spec, config.schema);
    if (errors.length > 0) {
      failures.push({ file: spec.filePath, errors });
      totalErrors += errors.length;
    }
  }

  if (failures.length === 0) {
    console.log(
      chalk.green(`* All ${specs.length} spec file(s) conform to schema.`)
    );
    return;
  }

  console.error(
    chalk.red(
      `\nx Schema validation failed (${failures.length} file(s), ${totalErrors} error(s)):\n`
    )
  );
  for (const failure of failures) {
    console.error(`  ${failure.file}:`);
    for (const error of failure.errors) {
      console.error(chalk.dim(`    - ${error}`));
    }
    console.error("");
  }
  process.exit(1);
}
```

**`packages/cli/src/commands/scan.ts`** (new file):

```typescript
import { loadConfig, loadSpecs, buildManifest } from "@sps/core";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { stringify } from "yaml";
import chalk from "chalk";

export async function scanCommand() {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot);
  const manifest = buildManifest(specs, config);

  const spsDir = join(repoRoot, ".sps");
  mkdirSync(spsDir, { recursive: true });

  const header = "# AUTO-GENERATED — do not edit. Run `sps scan` to refresh.\n\n";
  const content = header + stringify(manifest, { lineWidth: 100 });
  writeFileSync(join(spsDir, "manifest.yaml"), content, "utf-8");

  console.log(chalk.green("*"), "Manifest rebuilt");
  console.log(`  Files: ${manifest.totals.files}`);
  console.log(`  Rules: ${manifest.totals.rules}`);

  if (manifest.drift.length > 0) {
    console.log(chalk.yellow(`\n  Drift detected (${manifest.drift.length}):`));
    for (const d of manifest.drift) {
      console.log(chalk.dim(`    ${d.path}: ${d.issue}`));
    }
  }

  console.log("");
}
```

- [ ] **Step 6: Update packages/cli/package.json**

Change `"name": "@specflow/cli"` to `"name": "@sps/cli"`, change `"bin": { "specflow": ... }` to `"bin": { "sps": ... }`, and update the dependency from `"@specflow/core"` to `"@sps/core"`.

- [ ] **Step 7: Run CLI tests**

Run: `cd packages/cli && npx vitest run`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add packages/cli/
git commit -m "feat: rename CLI to sps, add scan command, update all commands for SPS schema"
```

---

### Task 13: Update Portal (`@sps/portal`)

**Files:**
- Modify: `packages/portal/src/app/layout.tsx`
- Modify: `packages/portal/src/app/page.tsx`
- Modify: `packages/portal/src/app/submit/page.tsx`
- Modify: `packages/portal/src/app/specs/page.tsx`
- Modify: `packages/portal/src/app/history/page.tsx`
- Modify: `packages/portal/src/app/api/submit/route.ts`
- Modify: `packages/portal/src/app/api/categories/route.ts`
- Modify: `packages/portal/src/components/spec-card.tsx`
- Modify: `packages/portal/package.json`
- Modify: `packages/portal/next.config.ts`

This task is large but straightforward — the portal is a consumer of `@sps/core` and the changes mirror the schema updates. Since the portal has no tests, we verify by building.

- [ ] **Step 1: Update package.json and next.config.ts**

In `packages/portal/package.json`: change name to `@sps/portal`, dependency from `@specflow/core` to `@sps/core`.

In `packages/portal/next.config.ts`: change transpile from `@specflow/core` to `@sps/core`.

- [ ] **Step 2: Update layout.tsx — rebrand**

Replace "Specflow" with "SPS" in the navigation bar title. Replace the description text.

- [ ] **Step 3: Update spec-card.tsx**

Replace `business_title` with `title`. Remove `summary` references. Update props to use `spec` instead of `domain`/`module`:

Key changes:
- Props: `rule, spec, trace?, categories?` (replace `domain`/`module` with `spec`)
- Display: `rule.title` instead of `rule.business_title || rule.summary`
- ID fallback: use `spec` instead of `domain/module`

- [ ] **Step 4: Update page.tsx (dashboard)**

Replace `loadSpecs(repoRoot, config.specs_dir)` with `loadSpecs(repoRoot)`. Replace `s.domain`/`s.module` with `s.spec`. Replace `r.summary` with `r.title`. Replace `r.business_title` with `r.title`.

- [ ] **Step 5: Update specs/page.tsx**

Replace `loadSpecs(repoRoot, config.specs_dir)` with `loadSpecs(repoRoot)`. Replace `s.domain/s.module` heading with `s.spec`. Pass `spec={s.spec}` to SpecCard.

- [ ] **Step 6: Update history/page.tsx**

Replace `loadSpecs(repoRoot, config.specs_dir)` with `loadSpecs(repoRoot)`. Replace `s.domain/s.module` with `s.spec`.

- [ ] **Step 7: Update api/submit/route.ts**

Replace `@specflow/core` import with `@sps/core`. Update hardcoded author to `portal-user@sps.dev`.

- [ ] **Step 8: Update api/categories/route.ts**

Replace `@specflow/core` import with `@sps/core`.

- [ ] **Step 9: Update submit/page.tsx**

Replace any "Specflow" branding text with "SPS".

- [ ] **Step 10: Build the portal to verify**

Run: `cd packages/portal && npm run build`
Expected: Build succeeds

- [ ] **Step 11: Commit**

```bash
git add packages/portal/
git commit -m "feat: rename portal to @sps/portal, update all pages for SPS schema"
```

---

### Task 14: Update Root Config and Documentation

**Files:**
- Modify: `package.json` (root)
- Modify: `README.md`
- Delete: `SPECSTORY.md` (replaced by design doc)
- Delete: `specs/` directory (if it exists)
- Delete: `.specstory/` or `.specflow/` directory (if it exists)

- [ ] **Step 1: Update root package.json**

Update the name and description. Replace any "specflow" references.

- [ ] **Step 2: Delete old directories and files**

```bash
rm -rf specs/ .specstory/ .specflow/
rm -f SPECSTORY.md
```

- [ ] **Step 3: Rewrite README.md**

Update README.md to reference SPS branding, `.sps/` directory, `.sps.yaml` files, and `sps` CLI command. Keep it concise.

- [ ] **Step 4: Run full test suite**

Run: `pnpm test`
Expected: ALL tests pass across all packages

- [ ] **Step 5: Build all packages**

Run: `pnpm build`
Expected: All packages build successfully

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: complete SPS rename — delete old files, update root config and docs"
```

---

### Task 15: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 2: Build all packages**

Run: `pnpm build`
Expected: All packages build

- [ ] **Step 3: Verify no old references remain**

Run: `grep -r "specflow\|specstory\|specs_dir\|business_title\|\"summary\"" packages/*/src/ --include="*.ts" --include="*.tsx"`
Expected: No matches (or only in legitimate contexts like the forbidden_rule_fields array)

- [ ] **Step 4: Verify no old references in tests**

Run: `grep -r "specflow\|specstory\|specs_dir\|business_title" packages/*/tests/ --include="*.ts"`
Expected: No matches

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final cleanup — verify no stale references"
```
