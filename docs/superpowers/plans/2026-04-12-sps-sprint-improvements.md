# SPS Sprint Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI agent instructions generation, test coverage analysis, principles support, CLAUDE.md dogfooding, and improved status output to the SPS toolset.

**Architecture:** New core modules (`agent.ts`, `coverage.ts`, `principles.ts`) + new CLI commands + CLAUDE.md generation.

**Tech Stack:** TypeScript, Vitest, pnpm workspaces, Commander, Chalk, yaml

**Design spec:** `docs/superpowers/specs/2026-04-12-sps-sprint-improvements-design.md`

---

### Task 1: Add Principles Support (`@sps/core`)

**Files:**
- Create: `packages/core/src/principles.ts`
- Create: `packages/core/tests/principles.test.ts`
- Modify: `packages/core/src/index.ts` (add export)

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/principles.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadPrinciples } from "../src/principles.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadPrinciples", () => {
  it("returns empty array when no principles file exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    const principles = loadPrinciples(dir);
    expect(principles).toEqual([]);
  });

  it("loads principles from .sps/principles.yaml", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, ".sps"));
    writeFileSync(
      join(dir, ".sps/principles.yaml"),
      `principles:\n  - id: no-silent-failures\n    title: "No silent failures"\n    description: "Every error path must log or return an error."\n  - id: money-in-cents\n    title: "Money in cents"\n    description: "All monetary values are integers in cents."\n`
    );
    const principles = loadPrinciples(dir);
    expect(principles).toHaveLength(2);
    expect(principles[0].id).toBe("no-silent-failures");
    expect(principles[0].title).toBe("No silent failures");
    expect(principles[1].id).toBe("money-in-cents");
  });

  it("returns empty array for malformed file", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, ".sps"));
    writeFileSync(join(dir, ".sps/principles.yaml"), "not valid yaml: [");
    const principles = loadPrinciples(dir);
    expect(principles).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run tests/principles.test.ts`

- [ ] **Step 3: Implement principles.ts**

```typescript
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

export interface Principle {
  id: string;
  title: string;
  description: string;
}

export function loadPrinciples(repoRoot: string): Principle[] {
  const filePath = join(repoRoot, ".sps", "principles.yaml");
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = parse(content) as { principles?: Principle[] };
    return parsed?.principles ?? [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Add export to index.ts**

Add to `packages/core/src/index.ts`:
```typescript
export { loadPrinciples } from "./principles.js";
export type { Principle } from "./principles.js";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/core && npx vitest run tests/principles.test.ts`

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/principles.ts packages/core/tests/principles.test.ts packages/core/src/index.ts
git commit -m "feat: add principles support — .sps/principles.yaml loading"
```

---

### Task 2: Add Agent Instructions Generator (`@sps/core`)

**Files:**
- Create: `packages/core/src/agent.ts`
- Create: `packages/core/tests/agent.test.ts`
- Modify: `packages/core/src/index.ts` (add export)

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/agent.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateAgentInstructions } from "../src/agent.js";
import type { SpecFile } from "../src/types.js";
import type { Principle } from "../src/principles.js";

const makeRule = (overrides = {}) => ({
  id: "REQ-CHECKOUT-COUPON-01",
  title: "Customers can use a percentage discount code",
  status: "active" as const,
  category: "business",
  description: "Applies a percentage discount to the cart subtotal.",
  given: "A customer has a $100 cart and enters SAVE20",
  when: "The coupon is applied at checkout",
  then: "The cart total becomes $80",
  examples: [],
  edge_cases: [],
  tests: [],
  ...overrides,
});

describe("generateAgentInstructions", () => {
  it("generates markdown with active rules", () => {
    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Coupon support",
        category: "business",
        touches: ["billing"],
        rules: [makeRule()],
        filePath: "src/checkout/coupons/coupons.sps.yaml",
      },
    ];

    const output = generateAgentInstructions(specs, []);
    expect(output).toContain("# SPS Spec Rules");
    expect(output).toContain("checkout/coupons");
    expect(output).toContain("REQ-CHECKOUT-COUPON-01");
    expect(output).toContain("Customers can use a percentage discount code");
    expect(output).toContain("Given:");
    expect(output).toContain("When:");
    expect(output).toContain("Then:");
    expect(output).toContain("touches: billing");
  });

  it("includes principles when provided", () => {
    const principles: Principle[] = [
      { id: "money-in-cents", title: "Money in cents", description: "All monetary values are integers in cents." },
    ];

    const output = generateAgentInstructions([], principles);
    expect(output).toContain("## Principles");
    expect(output).toContain("Money in cents");
    expect(output).toContain("integers in cents");
  });

  it("skips deprecated rules", () => {
    const specs: SpecFile[] = [
      {
        spec: "checkout/old",
        title: "Old",
        description: "Old spec",
        category: "business",
        touches: [],
        rules: [makeRule({ id: "REQ-OLD-01", status: "deprecated", title: "Old rule" })],
        filePath: "src/checkout/old.sps.yaml",
      },
    ];

    const output = generateAgentInstructions(specs, []);
    expect(output).not.toContain("REQ-OLD-01");
  });

  it("returns minimal output for empty specs", () => {
    const output = generateAgentInstructions([], []);
    expect(output).toContain("# SPS Spec Rules");
    expect(output).toContain("No active spec rules found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement agent.ts**

```typescript
import type { SpecFile } from "./types.js";
import type { Principle } from "./principles.js";

export function generateAgentInstructions(
  specs: SpecFile[],
  principles: Principle[]
): string {
  const lines: string[] = [];

  lines.push("# SPS Spec Rules");
  lines.push("");
  lines.push("> Auto-generated by `sps agent`. Do not edit manually.");
  lines.push("> Run `sps agent` to regenerate after spec changes.");
  lines.push("");

  // Principles
  if (principles.length > 0) {
    lines.push("## Principles");
    lines.push("");
    for (const p of principles) {
      lines.push(`- **${p.title}** — ${p.description}`);
    }
    lines.push("");
  }

  // Collect active rules across all specs
  const activeSpecs = specs.filter((s) =>
    s.rules.some((r) => r.status === "active" || r.status === "proposed")
  );

  if (activeSpecs.length === 0) {
    lines.push("No active spec rules found. Run `sps submit` to create specs.");
    return lines.join("\n");
  }

  lines.push("## Active Rules");
  lines.push("");

  for (const spec of activeSpecs) {
    const touchesStr = spec.touches.length > 0
      ? ` (touches: ${spec.touches.join(", ")})`
      : "";
    lines.push(`### ${spec.spec} — ${spec.title}${touchesStr}`);
    lines.push("");

    const activeRules = spec.rules.filter(
      (r) => r.status === "active" || r.status === "proposed"
    );

    for (const rule of activeRules) {
      const status = rule.status === "proposed" ? " [PROPOSED]" : "";
      lines.push(`- **${rule.id}** ${rule.title}${status}`);
      lines.push(`  - Given: ${rule.given}`);
      lines.push(`  - When: ${rule.when}`);
      lines.push(`  - Then: ${rule.then}`);

      if (rule.edge_cases.length > 0) {
        for (const ec of rule.edge_cases) {
          lines.push(`  - Edge case: ${ec.case} → ${ec.decision}`);
        }
      }

      if (rule.id) {
        lines.push(`  - Tests: Link test describe blocks with \`[${rule.id}]\``);
      }

      lines.push("");
    }
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Add export to index.ts**

Add to `packages/core/src/index.ts`:
```typescript
export { generateAgentInstructions } from "./agent.js";
```

- [ ] **Step 5: Run test to verify it passes**

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/agent.ts packages/core/tests/agent.test.ts packages/core/src/index.ts
git commit -m "feat: add agent instructions generator — produces CLAUDE.md from specs"
```

---

### Task 3: Add Coverage Analysis (`@sps/core`)

**Files:**
- Create: `packages/core/src/coverage.ts`
- Create: `packages/core/tests/coverage.test.ts`
- Modify: `packages/core/src/index.ts` (add export)

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/coverage.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { analyzeCoverage } from "../src/coverage.js";
import type { SpecFile } from "../src/types.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const makeRule = (id: string, title: string) => ({
  id,
  title,
  status: "active" as const,
  category: "business",
  description: "",
  given: "",
  when: "",
  then: "",
  examples: [],
  edge_cases: [],
  tests: [],
});

describe("analyzeCoverage", () => {
  it("reports all rules as uncovered when no test files exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Coupons",
        category: "business",
        touches: [],
        rules: [makeRule("REQ-CHECKOUT-COUPON-01", "Apply coupon")],
        filePath: "src/checkout/coupons.sps.yaml",
      },
    ];

    const result = analyzeCoverage(specs, dir);
    expect(result.totalRules).toBe(1);
    expect(result.coveredRules).toBe(0);
    expect(result.uncovered).toHaveLength(1);
    expect(result.uncovered[0].ruleId).toBe("REQ-CHECKOUT-COUPON-01");
  });

  it("detects coverage from test files containing lineage IDs", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "src/checkout"), { recursive: true });
    writeFileSync(
      join(dir, "src/checkout/coupons.test.ts"),
      `describe("[REQ-CHECKOUT-COUPON-01] Apply coupon", () => {\n  it("applies discount", () => {});\n});\n`
    );

    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Coupons",
        category: "business",
        touches: [],
        rules: [
          makeRule("REQ-CHECKOUT-COUPON-01", "Apply coupon"),
          makeRule("REQ-CHECKOUT-COUPON-02", "Remove coupon"),
        ],
        filePath: "src/checkout/coupons.sps.yaml",
      },
    ];

    const result = analyzeCoverage(specs, dir);
    expect(result.totalRules).toBe(2);
    expect(result.coveredRules).toBe(1);
    expect(result.covered).toHaveLength(1);
    expect(result.covered[0].ruleId).toBe("REQ-CHECKOUT-COUPON-01");
    expect(result.uncovered).toHaveLength(1);
    expect(result.uncovered[0].ruleId).toBe("REQ-CHECKOUT-COUPON-02");
  });

  it("skips rules with null IDs", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    const specs: SpecFile[] = [
      {
        spec: "test/mod",
        title: "Test",
        description: "Test",
        category: "business",
        touches: [],
        rules: [{ ...makeRule("REQ-TEST-01", "Rule 1"), id: null }],
        filePath: "src/test.sps.yaml",
      },
    ];

    const result = analyzeCoverage(specs, dir);
    expect(result.totalRules).toBe(0);
  });

  it("calculates coverage percentage", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "tests"), { recursive: true });
    writeFileSync(
      join(dir, "tests/checkout.test.ts"),
      `describe("[REQ-CHECKOUT-01] Checkout", () => {});\ndescribe("[REQ-CHECKOUT-02] Cart", () => {});\n`
    );

    const specs: SpecFile[] = [
      {
        spec: "checkout",
        title: "Checkout",
        description: "Checkout",
        category: "business",
        touches: [],
        rules: [
          makeRule("REQ-CHECKOUT-01", "Checkout"),
          makeRule("REQ-CHECKOUT-02", "Cart"),
          makeRule("REQ-CHECKOUT-03", "Payment"),
          makeRule("REQ-CHECKOUT-04", "Confirmation"),
        ],
        filePath: "src/checkout.sps.yaml",
      },
    ];

    const result = analyzeCoverage(specs, dir);
    expect(result.totalRules).toBe(4);
    expect(result.coveredRules).toBe(2);
    expect(result.coveragePercent).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement coverage.ts**

```typescript
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import type { SpecFile } from "./types.js";

const TEST_PATTERNS = [
  ".test.ts", ".test.js", ".test.tsx", ".test.jsx",
  ".spec.ts", ".spec.js",
  "_test.go", "_test.py",
];

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".sps",
]);

const LINEAGE_ID_PATTERN = /REQ-[A-Z]+-[A-Z]+-\d{2,}/g;

export interface CoverageResult {
  totalRules: number;
  coveredRules: number;
  coveragePercent: number;
  covered: Array<{ ruleId: string; specFile: string; title: string; testFiles: string[] }>;
  uncovered: Array<{ ruleId: string; specFile: string; title: string }>;
}

function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...findTestFiles(fullPath));
      } else if (TEST_PATTERNS.some((p) => entry.endsWith(p))) {
        files.push(fullPath);
      }
    }
  } catch {
    // directory may not exist
  }
  return files;
}

function extractIdsFromTestFiles(repoRoot: string): Map<string, string[]> {
  const idToFiles = new Map<string, string[]>();
  const testFiles = findTestFiles(repoRoot);

  for (const filePath of testFiles) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const matches = content.match(LINEAGE_ID_PATTERN);
      if (matches) {
        const relativePath = filePath.slice(repoRoot.length + 1);
        for (const id of new Set(matches)) {
          const existing = idToFiles.get(id) || [];
          existing.push(relativePath);
          idToFiles.set(id, existing);
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  return idToFiles;
}

export function analyzeCoverage(
  specs: SpecFile[],
  repoRoot: string
): CoverageResult {
  const idToTestFiles = extractIdsFromTestFiles(repoRoot);

  const allRules: Array<{ ruleId: string; specFile: string; title: string }> = [];
  for (const spec of specs) {
    for (const rule of spec.rules) {
      if (rule.id) {
        allRules.push({
          ruleId: rule.id,
          specFile: spec.filePath,
          title: rule.title,
        });
      }
    }
  }

  const covered: CoverageResult["covered"] = [];
  const uncovered: CoverageResult["uncovered"] = [];

  for (const rule of allRules) {
    const testFiles = idToTestFiles.get(rule.ruleId);
    if (testFiles && testFiles.length > 0) {
      covered.push({ ...rule, testFiles });
    } else {
      uncovered.push(rule);
    }
  }

  const totalRules = allRules.length;
  const coveredRules = covered.length;
  const coveragePercent = totalRules > 0
    ? Math.round((coveredRules / totalRules) * 100)
    : 100;

  return { totalRules, coveredRules, coveragePercent, covered, uncovered };
}
```

- [ ] **Step 4: Add export to index.ts**

Add to `packages/core/src/index.ts`:
```typescript
export { analyzeCoverage } from "./coverage.js";
export type { CoverageResult } from "./coverage.js";
```

- [ ] **Step 5: Run test to verify it passes**

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/coverage.ts packages/core/tests/coverage.test.ts packages/core/src/index.ts
git commit -m "feat: add test coverage analysis — scans test files for lineage IDs"
```

---

### Task 4: Add CLI Commands (`agent`, `coverage`)

**Files:**
- Create: `packages/cli/src/commands/agent.ts`
- Create: `packages/cli/src/commands/coverage.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Implement agent command**

```typescript
import { loadConfig, loadSpecs, generateAgentInstructions, loadPrinciples } from "@sps/core";
import { writeFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";

export async function agentCommand(options: { output?: string }) {
  const repoRoot = process.cwd();
  const specs = loadSpecs(repoRoot);
  const principles = loadPrinciples(repoRoot);

  const content = generateAgentInstructions(specs, principles);

  const outputPath = options.output || join(repoRoot, "CLAUDE.md");
  writeFileSync(outputPath, content, "utf-8");

  const activeRules = specs.flatMap((s) =>
    s.rules.filter((r) => r.status === "active" || r.status === "proposed")
  );

  console.log(chalk.green("*"), `Agent instructions written to ${outputPath.replace(repoRoot + "/", "")}`);
  console.log(`  Specs:      ${specs.length}`);
  console.log(`  Rules:      ${activeRules.length}`);
  console.log(`  Principles: ${principles.length}`);
  console.log("");
}
```

- [ ] **Step 2: Implement coverage command**

```typescript
import { loadSpecs, analyzeCoverage } from "@sps/core";
import chalk from "chalk";

export async function coverageCommand(options: { strict?: boolean }) {
  const repoRoot = process.cwd();
  const specs = loadSpecs(repoRoot);
  const result = analyzeCoverage(specs, repoRoot);

  console.log("\nSPS Test Coverage Report");
  console.log("========================");
  console.log(`Total rules:     ${result.totalRules}`);
  console.log(`Covered:         ${chalk.green(result.coveredRules)} (${result.coveragePercent}%)`);
  console.log(`Uncovered:       ${result.uncovered.length > 0 ? chalk.red(result.uncovered.length) : 0}`);
  console.log("");

  if (result.uncovered.length > 0) {
    console.log(chalk.yellow("Uncovered rules:"));
    for (const r of result.uncovered) {
      console.log(`  ${chalk.dim(r.ruleId.padEnd(30))} ${r.title}`);
      console.log(`  ${chalk.dim("".padEnd(30))} ${chalk.dim(r.specFile)}`);
    }
    console.log("");
  }

  if (result.covered.length > 0 && result.uncovered.length === 0) {
    console.log(chalk.green("All spec rules have test coverage."));
    console.log("");
  }

  if (options.strict && result.uncovered.length > 0) {
    process.exit(1);
  }
}
```

- [ ] **Step 3: Register commands in index.ts**

Add to `packages/cli/src/index.ts`:
```typescript
import { agentCommand } from "./commands/agent.js";
import { coverageCommand } from "./commands/coverage.js";

// ... after existing commands:

program
  .command("agent")
  .description("Generate AI agent instructions from specs")
  .option("-o, --output <path>", "Output file path (default: CLAUDE.md)")
  .action(agentCommand);

program
  .command("coverage")
  .description("Analyze test coverage of spec rules")
  .option("--strict", "Exit with code 1 if any rules lack test coverage")
  .action(coverageCommand);
```

- [ ] **Step 4: Run all CLI tests**

Run: `cd packages/cli && npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/agent.ts packages/cli/src/commands/coverage.ts packages/cli/src/index.ts
git commit -m "feat: add sps agent and sps coverage CLI commands"
```

---

### Task 5: Write CLAUDE.md for SPS Repo (Dogfooding)

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write CLAUDE.md**

Write a CLAUDE.md that covers the SPS project structure, conventions, and testing approach. This dogfoods our own tool and helps agents working on the codebase.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md — dogfooding SPS for our own repo"
```

---

### Task 6: Improve `sps status` Output

**Files:**
- Modify: `packages/cli/src/commands/status.ts`

- [ ] **Step 1: Update status command**

Add category breakdown, touches info, and manifest-aware output to the status command. Support `--json` flag for programmatic use.

- [ ] **Step 2: Run CLI tests**

Run: `cd packages/cli && npx vitest run`

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/commands/status.ts
git commit -m "feat: improve sps status output — category breakdown, touches, json flag"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `cd packages/core && npx vitest run && cd ../cli && npx vitest run`

- [ ] **Step 2: Build portal**

Run: `cd packages/portal && npm run build`

- [ ] **Step 3: Commit sprint spec and plan**

```bash
git add docs/
git commit -m "docs: add sprint design spec, plan, and competitive analysis"
```
