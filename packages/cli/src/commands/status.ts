import { loadConfig, loadSpecs } from "@sps/core";
import chalk from "chalk";

export async function statusCommand(
  dir: string | undefined,
  options: { gapsOnly?: boolean }
) {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  let specs = loadSpecs(repoRoot);

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
