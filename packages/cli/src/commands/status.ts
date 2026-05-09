import { loadConfig, loadSpecs } from "@sps/core";
import chalk from "chalk";

export async function statusCommand(
  dir: string | undefined,
  options: { gapsOnly?: boolean; json?: boolean }
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

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const r of allRules) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  }

  // Touches graph
  const touchesMap: Record<string, string[]> = {};
  for (const s of specs) {
    if (s.touches.length > 0) {
      touchesMap[s.spec] = s.touches;
    }
  }

  // JSON output
  if (options.json) {
    const output = {
      specs: specs.length,
      rules: {
        total: allRules.length,
        active: active.length,
        proposed: proposed.length,
        deprecated: deprecated.length,
        needsId: needsId.length,
      },
      byCategory,
      touches: touchesMap,
      ...(dir ? { filter: dir } : {}),
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (!options.gapsOnly) {
    console.log("\nSPS Status Report");
    console.log("=================");
    console.log(`Spec files:      ${specs.length}`);
    console.log(`Total rules:     ${allRules.length}`);
    console.log(`Active:          ${chalk.green(active.length)}`);
    console.log(`Proposed:        ${chalk.yellow(proposed.length)}`);
    console.log(`Deprecated:      ${chalk.dim(deprecated.length)}`);
    console.log(`Needs ID:        ${needsId.length > 0 ? chalk.red(needsId.length) : 0}`);

    // Category breakdown
    if (Object.keys(byCategory).length > 0) {
      console.log("");
      console.log("By category:");
      for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
        const color = config.categories.find((c) => c.id === cat)?.color;
        const label = config.categories.find((c) => c.id === cat)?.label || cat;
        console.log(`  ${label.padEnd(20)} ${count}`);
      }
    }

    // Cross-cutting references
    if (Object.keys(touchesMap).length > 0) {
      console.log("");
      console.log("Cross-cutting specs:");
      for (const [spec, touches] of Object.entries(touchesMap)) {
        console.log(`  ${spec} ${chalk.dim("->")} ${touches.join(", ")}`);
      }
    }

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
