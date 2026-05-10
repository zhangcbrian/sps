import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync } from "fs";
import { join } from "path";
import { stringify } from "yaml";
import { DEFAULT_CONFIG } from "@zhangcbrian/sps-core";
import chalk from "chalk";

interface InitOptions {
  ci?: "github" | "husky";
}

const GITHUB_WORKFLOW = `name: sps

on:
  pull_request:
  push:
    branches: [main]

jobs:
  sps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
      - name: Install sps
        run: npm i -g @zhangcbrian/sps-cli
      - name: Validate specs
        run: sps validate --strict-touches --against=origin/\${{ github.base_ref || 'main' }}
      - name: Coverage
        run: sps coverage --strict
      - name: Lint
        run: sps lint
`;

const HUSKY_PRE_PUSH = `#!/usr/bin/env sh
# sps pre-push: cheap local gate before CI sees the branch.
sps validate --strict-touches || exit 1
`;

export async function initCommand(options: InitOptions = {}) {
  const repoRoot = process.cwd();

  if (options.ci === "github") {
    return writeGithubWorkflow(repoRoot);
  }
  if (options.ci === "husky") {
    return writeHuskyHook(repoRoot);
  }

  return writeBaselineConfig(repoRoot);
}

function writeBaselineConfig(repoRoot: string) {
  const configDir = join(repoRoot, ".sps");
  const configPath = join(configDir, "config.yaml");

  if (existsSync(configPath)) {
    console.log(chalk.yellow("! .sps/config.yaml already exists. Skipping."));
    return;
  }

  mkdirSync(configDir, { recursive: true });
  const configContent = stringify(DEFAULT_CONFIG, { lineWidth: 80 });
  writeFileSync(configPath, configContent, "utf-8");
  console.log(chalk.green("*"), "Created .sps/config.yaml");

  const examplePath = join(configDir, "example.sps.yaml");
  const example = `# Example SPS spec file — copy this next to your code and rename it.
# e.g., src/checkout/checkout.sps.yaml

spec: example/feature
title: "Example Feature"
description: >
  Describe what this feature does in plain English.
  Business stakeholders should be able to read this.

category: business    # business | engineering | security | ux | data
touches: []           # other domains this spec affects, e.g. [billing, auth]

rules:
  - id: null          # assigned automatically by sps submit
    title: "Users can do the thing"
    status: proposed   # proposed | active | deprecated | superseded | removed
    category: business
    description: >
      A 1–3 sentence summary. Push history and caveats to \`notes\`.
    given: >
      A user is logged in and has items in their cart.
    when: >
      They click the checkout button.
    then: >
      An order is created and confirmation is shown.
    behavior:
      surface: trpc.org.checkout.create
      inputs: { cartId: string }
      outputs: { orderId: string }
      invariants:
        - "cart must be non-empty"
        - "creates exactly one order per call"
      errors:
        - { code: EMPTY_CART, when: "cart has no items" }
    examples:
      - input: { cart_items: 3, total_cents: 5000 }
        output: { order_id: "ORD-001", status: "confirmed" }
    edge_cases:
      - case: "Empty cart"
        decision: "Show error message, do not create order"
    tests: []
`;
  writeFileSync(examplePath, example, "utf-8");
  console.log(chalk.green("*"), "Created .sps/example.sps.yaml");

  console.log(
    `\n${chalk.bold("sps initialized.")} Copy .sps/example.sps.yaml next to your code to start writing specs.\nRun ${chalk.dim("sps scan")} to build the manifest, ${chalk.dim("sps init --ci=github")} for CI, or ${chalk.dim("sps init --ci=husky")} for a pre-push hook.\n`
  );
}

function writeGithubWorkflow(repoRoot: string) {
  const dir = join(repoRoot, ".github", "workflows");
  const target = join(dir, "sps.yml");
  if (existsSync(target)) {
    console.log(
      chalk.yellow(
        `! .github/workflows/sps.yml already exists. Edit manually if you want to customize. Skipping.`
      )
    );
    return;
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(target, GITHUB_WORKFLOW, "utf-8");
  console.log(chalk.green("*"), "Created .github/workflows/sps.yml");
  console.log(
    chalk.dim(
      "  Runs sps validate --strict-touches --against=origin/main, coverage --strict, and lint on every PR."
    )
  );
}

function writeHuskyHook(repoRoot: string) {
  const dir = join(repoRoot, ".husky");
  const target = join(dir, "pre-push");
  mkdirSync(dir, { recursive: true });
  let content = HUSKY_PRE_PUSH;
  if (existsSync(target)) {
    const existing = readFileSync(target, "utf-8");
    if (existing.includes("sps validate")) {
      console.log(chalk.yellow("! .husky/pre-push already mentions sps validate. Skipping."));
      return;
    }
    content = existing.replace(/\n*$/, "\n") + "\n# sps gate\nsps validate --strict-touches || exit 1\n";
  }
  writeFileSync(target, content, "utf-8");
  try {
    chmodSync(target, 0o755);
  } catch {
    // ignore on platforms that don't allow chmod
  }
  console.log(chalk.green("*"), "Wrote .husky/pre-push (sps validate --strict-touches)");
  console.log(
    chalk.dim(
      "  Make sure husky is installed (`pnpm add -D husky && pnpm husky`)."
    )
  );
}
