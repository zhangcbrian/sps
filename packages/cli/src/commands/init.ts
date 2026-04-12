import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { stringify } from "yaml";
import { DEFAULT_CONFIG } from "@specflow/core";
import chalk from "chalk";

export async function initCommand() {
  const repoRoot = process.cwd();
  const configDir = join(repoRoot, ".specflow");
  const configPath = join(configDir, "config.yaml");
  const specsDir = join(repoRoot, "specs");
  const templateDir = join(specsDir, "_templates");
  const templatePath = join(templateDir, "spec-template.yaml");

  if (existsSync(configPath)) {
    console.log(
      chalk.yellow("⚠ .specflow/config.yaml already exists. Skipping.")
    );
    return;
  }

  // Create .specflow/config.yaml
  mkdirSync(configDir, { recursive: true });
  const configContent = stringify(DEFAULT_CONFIG, { lineWidth: 80 });
  writeFileSync(configPath, configContent, "utf-8");
  console.log(chalk.green("✓"), "Created .specflow/config.yaml");

  // Create specs directory
  mkdirSync(templateDir, { recursive: true });
  console.log(chalk.green("✓"), "Created specs/ directory");

  // Create template
  const template = `# specs/{domain}/{module}.spec.yaml
# See docs at https://github.com/specflow/specflow

domain: DOMAIN_NAME
module: MODULE_NAME
description: >
  Plain-English description of what this module does.

rules:
  - id: null
    status: proposed
    summary: "One-line business rule in plain English"
    description: >
      Detailed explanation a product manager can read.
    given: >
      Preconditions with concrete values.
    when: >
      The trigger action.
    then: >
      The expected outcome.
    examples:
      - input: { }
        output: { }
    edge_cases:
      - case: "Edge case description"
        decision: "What the system does"
        ref: ""
    tests: []
    added: "${new Date().toISOString().split("T")[0]}"
    modified: null
`;
  writeFileSync(templatePath, template, "utf-8");
  console.log(chalk.green("✓"), "Created specs/_templates/spec-template.yaml");

  console.log(
    `\n${chalk.bold("Specflow initialized.")} Edit .specflow/config.yaml to customize.\n`
  );
}
