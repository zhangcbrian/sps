import {
  loadConfig,
  loadSpecs,
  validateSpec,
  analyzeCoverage,
  buildManifest,
  loadPrinciples,
  validateTouches,
  validateUniqueness,
  validateCrossRefs,
} from "@specflow/core";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { stringify } from "yaml";
import chalk from "chalk";

interface DoctorOptions {
  json?: boolean;
}

export async function doctorCommand(options: DoctorOptions = {}) {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot);
  const principles = loadPrinciples(repoRoot);

  const totalRules = specs.reduce((sum, s) => sum + s.rules.length, 0);

  const schemaFailures: Array<{ file: string; errors: string[] }> = [];
  let totalErrors = 0;
  for (const spec of specs) {
    const errors = validateSpec(spec, config.schema, config.categories);
    if (errors.length > 0) {
      schemaFailures.push({ file: spec.filePath, errors });
      totalErrors += errors.length;
    }
  }

  const duplicates = validateUniqueness(specs);
  const unresolvedRefs = validateCrossRefs(specs);
  const touchesWarnings = validateTouches(specs, repoRoot);
  const coverage = analyzeCoverage(specs, repoRoot);

  const manifest = buildManifest(specs, config);
  const spsDir = join(repoRoot, ".sps");
  mkdirSync(spsDir, { recursive: true });
  const header = "# AUTO-GENERATED — do not edit. Run `sps scan` to refresh.\n\n";
  const content = header + stringify(manifest, { lineWidth: 100 });
  writeFileSync(join(spsDir, "manifest.yaml"), content, "utf-8");

  const hasIssues =
    schemaFailures.length > 0 ||
    duplicates.length > 0 ||
    unresolvedRefs.length > 0 ||
    manifest.drift.length > 0;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          ok: !hasIssues,
          discovery: {
            spec_files: specs.length,
            principles: principles.length,
            total_rules: totalRules,
          },
          schema_failures: schemaFailures,
          duplicates,
          unresolved_refs: unresolvedRefs,
          touches_warnings: touchesWarnings,
          coverage,
          drift: manifest.drift,
        },
        null,
        2
      )
    );
    return;
  }

  console.log("\nSPS Doctor");
  console.log("==========\n");

  console.log(chalk.bold("Discovery"));
  console.log(`  Spec files:  ${specs.length}`);
  console.log(`  Principles:  ${principles.length}`);
  console.log(`  Total rules: ${totalRules}`);
  console.log("");

  console.log(chalk.bold("Schema Validation"));
  if (schemaFailures.length === 0) {
    console.log(chalk.green("  * All specs valid"));
  } else {
    console.log(chalk.red(`  x ${totalErrors} error(s) in ${schemaFailures.length} file(s)`));
    for (const f of schemaFailures) {
      console.log(`    ${f.file}:`);
      for (const e of f.errors) console.log(chalk.dim(`      - ${e}`));
    }
  }
  console.log("");

  console.log(chalk.bold("ID Uniqueness"));
  if (duplicates.length === 0) {
    console.log(chalk.green("  * All rule IDs unique"));
  } else {
    console.log(chalk.red(`  x ${duplicates.length} duplicate ID(s)`));
    for (const d of duplicates) {
      console.log(`    ${d.id}: ${d.occurrences.map((o) => o.specFile).join(", ")}`);
    }
  }
  console.log("");

  console.log(chalk.bold("Cross-References"));
  if (unresolvedRefs.length === 0) {
    console.log(chalk.green("  * All citations resolve"));
  } else {
    console.log(chalk.red(`  x ${unresolvedRefs.length} unresolved citation(s)`));
    for (const u of unresolvedRefs) {
      console.log(
        chalk.dim(`    ${u.specFile} ${u.ruleId ?? `[${u.ruleIndex}]`}: cites ${u.unresolvedRef}`)
      );
    }
  }
  console.log("");

  console.log(chalk.bold("Touches References"));
  if (touchesWarnings.length === 0) {
    console.log(chalk.green("  * All touches references valid"));
  } else {
    console.log(chalk.yellow(`  ! ${touchesWarnings.length} warning(s)`));
    for (const w of touchesWarnings.slice(0, 10)) {
      console.log(chalk.dim(`    ${w.specFile}: ${w.message}`));
    }
    if (touchesWarnings.length > 10) {
      console.log(chalk.dim(`    ... and ${touchesWarnings.length - 10} more`));
    }
  }
  console.log("");

  console.log(chalk.bold("Test Coverage"));
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

  console.log(chalk.bold("Manifest"));
  console.log(chalk.green("  * Manifest rebuilt"));
  if (manifest.drift.length > 0) {
    console.log(chalk.yellow(`  ! ${manifest.drift.length} drift warning(s)`));
    for (const d of manifest.drift) {
      console.log(chalk.dim(`    ${d.path}: ${d.issue}`));
    }
  }
  console.log("");

  if (hasIssues) {
    console.log(chalk.yellow("Some issues found. See above for details.\n"));
  } else {
    console.log(chalk.green("All clear.\n"));
  }
}
