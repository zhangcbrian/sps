import {
  loadConfig,
  loadSpecs,
  validateSpec,
  analyzeCoverage,
  buildManifest,
  loadPrinciples,
  validateTouches,
} from "@sps/core";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { stringify } from "yaml";
import chalk from "chalk";

export async function doctorCommand() {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot);
  const principles = loadPrinciples(repoRoot);

  let hasIssues = false;

  console.log("\nSPS Doctor");
  console.log("==========\n");

  // 1. Discovery
  console.log(chalk.bold("Discovery"));
  console.log(`  Spec files:  ${specs.length}`);
  console.log(`  Principles:  ${principles.length}`);
  const totalRules = specs.reduce((sum, s) => sum + s.rules.length, 0);
  console.log(`  Total rules: ${totalRules}`);
  console.log("");

  // 2. Schema validation
  console.log(chalk.bold("Schema Validation"));
  let totalErrors = 0;
  const failures: Array<{ file: string; errors: string[] }> = [];

  for (const spec of specs) {
    const errors = validateSpec(spec, config.schema, config.categories);
    if (errors.length > 0) {
      failures.push({ file: spec.filePath, errors });
      totalErrors += errors.length;
    }
  }

  if (failures.length === 0) {
    console.log(chalk.green("  * All specs valid"));
  } else {
    hasIssues = true;
    console.log(chalk.red(`  x ${totalErrors} error(s) in ${failures.length} file(s)`));
    for (const f of failures) {
      console.log(`    ${f.file}:`);
      for (const e of f.errors) {
        console.log(chalk.dim(`      - ${e}`));
      }
    }
  }
  console.log("");

  // 3. Touches validation
  console.log(chalk.bold("Touches References"));
  const touchesWarnings = validateTouches(specs, repoRoot);
  if (touchesWarnings.length === 0) {
    console.log(chalk.green("  * All touches references valid"));
  } else {
    console.log(chalk.yellow(`  ! ${touchesWarnings.length} warning(s)`));
    for (const w of touchesWarnings) {
      console.log(chalk.dim(`    ${w.specFile}: ${w.message}`));
    }
  }
  console.log("");

  // 4. Test coverage
  console.log(chalk.bold("Test Coverage"));
  const coverage = analyzeCoverage(specs, repoRoot);
  if (coverage.totalRules === 0) {
    console.log(chalk.dim("  No rules with IDs to check"));
  } else {
    const pct = coverage.coveragePercent;
    const color = pct === 100 ? chalk.green : pct >= 50 ? chalk.yellow : chalk.red;
    console.log(`  ${color(`${pct}%`)} (${coverage.coveredRules}/${coverage.totalRules} rules covered)`);
    if (coverage.uncovered.length > 0) {
      console.log(chalk.yellow("  Uncovered:"));
      for (const r of coverage.uncovered.slice(0, 10)) {
        console.log(chalk.dim(`    ${r.ruleId} — ${r.title}`));
      }
      if (coverage.uncovered.length > 10) {
        console.log(chalk.dim(`    ... and ${coverage.uncovered.length - 10} more`));
      }
    }
  }
  console.log("");

  // 5. Manifest rebuild
  console.log(chalk.bold("Manifest"));
  const manifest = buildManifest(specs, config);
  const spsDir = join(repoRoot, ".sps");
  mkdirSync(spsDir, { recursive: true });
  const header = "# AUTO-GENERATED — do not edit. Run `sps scan` to refresh.\n\n";
  const content = header + stringify(manifest, { lineWidth: 100 });
  writeFileSync(join(spsDir, "manifest.yaml"), content, "utf-8");
  console.log(chalk.green("  * Manifest rebuilt"));
  if (manifest.drift.length > 0) {
    hasIssues = true;
    console.log(chalk.yellow(`  ! ${manifest.drift.length} drift warning(s)`));
    for (const d of manifest.drift) {
      console.log(chalk.dim(`    ${d.path}: ${d.issue}`));
    }
  }
  console.log("");

  // Summary
  if (hasIssues) {
    console.log(chalk.yellow("Some issues found. See above for details.\n"));
  } else {
    console.log(chalk.green("All clear.\n"));
  }
}
