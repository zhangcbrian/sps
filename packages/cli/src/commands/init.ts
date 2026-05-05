import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { stringify } from "yaml";
import { DEFAULT_CONFIG } from "@specflow/core";
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

  // Generate example spec file
  const examplePath = join(configDir, "example.sps.yaml");
  const example = `# Example SPS spec file — copy this next to your code and rename it.
# e.g., src/checkout/checkout.sps.yaml

spec: example/feature
title: "Example Feature"
description: >
  Describe what this feature does in plain English.
  Business stakeholders should be able to read this.

category: business    # business | engineering | security
touches: []           # other domains this spec affects, e.g. [billing, auth]

rules:
  - id: null          # assigned automatically by sps submit
    title: "Users can do the thing"
    status: proposed   # proposed | active | deprecated
    category: business
    description: >
      Detailed explanation a product manager can read.
    given: >
      A user is logged in and has items in their cart.
    when: >
      They click the checkout button.
    then: >
      An order is created and confirmation is shown.
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
    `\n${chalk.bold("SPS initialized.")} Copy .sps/example.sps.yaml next to your code to start writing specs.\nRun ${chalk.dim("sps scan")} to build the manifest.\n`
  );
}
