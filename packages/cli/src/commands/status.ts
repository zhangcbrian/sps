import { loadConfig, loadSpecs } from "@specflow/core";
import chalk from "chalk";

export async function statusCommand(options: { gapsOnly?: boolean }) {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot, config.specs_dir);

  const allRules = specs.flatMap((s) =>
    s.rules.map((r) => ({
      ...r,
      domain: s.domain,
      module: s.module,
      specFile: s.filePath,
    }))
  );

  const active = allRules.filter((r) => r.status === "active");
  const proposed = allRules.filter((r) => r.status === "proposed");
  const deprecated = allRules.filter((r) => r.status === "deprecated");
  const needsId = active.filter((r) => !r.id);

  if (!options.gapsOnly) {
    console.log("\nSpec Status Report");
    console.log("──────────────────");
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
      console.log(`  ${r.specFile.padEnd(45)} ${r.summary}`);
    }
    console.log("");
  }

  if (
    options.gapsOnly &&
    needsId.length === 0
  ) {
    console.log(chalk.green("No gaps found."));
  }
}
