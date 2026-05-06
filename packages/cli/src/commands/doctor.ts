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
  lintSpecs,
} from "@sls/core";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { stringify } from "yaml";
import chalk from "chalk";

interface AdoptionStatus {
  config_present: boolean;
  principles_present: boolean;
  manifest_present: boolean;
  github_workflow_present: boolean;
  husky_hook_present: boolean;
}

function evaluateAdoption(repoRoot: string): AdoptionStatus {
  const huskyPath = join(repoRoot, ".husky/pre-push");
  const huskyHasGate = existsSync(huskyPath)
    ? readFileSync(huskyPath, "utf-8").includes("sps validate")
    : false;
  return {
    config_present: existsSync(join(repoRoot, ".sps/config.yaml")),
    principles_present: existsSync(join(repoRoot, ".sps/principles.yaml")),
    manifest_present: existsSync(join(repoRoot, ".sps/manifest.yaml")),
    github_workflow_present: existsSync(
      join(repoRoot, ".github/workflows/sls.yml")
    ),
    husky_hook_present: huskyHasGate,
  };
}

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
  const touchesWarnings = validateTouches(specs, repoRoot, config);
  const coverage = analyzeCoverage(specs, repoRoot);
  const lintFindings = lintSpecs(specs);

  const manifest = buildManifest(specs, config);
  const spsDir = join(repoRoot, ".sps");
  mkdirSync(spsDir, { recursive: true });
  const header = "# AUTO-GENERATED — do not edit. Run `sps scan` to refresh.\n\n";
  const content = header + stringify(manifest, { lineWidth: 100 });
  writeFileSync(join(spsDir, "manifest.yaml"), content, "utf-8");

  // Adoption is evaluated AFTER the manifest write so the same run
  // doesn't report `manifest_present: false` on a fresh repo where the
  // Manifest section just rebuilt it.
  const adoption = evaluateAdoption(repoRoot);

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
          lint_findings: lintFindings,
          adoption,
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

  console.log(chalk.bold("Lint"));
  if (lintFindings.length === 0) {
    console.log(chalk.green("  * No style/quality findings"));
  } else {
    console.log(chalk.yellow(`  ! ${lintFindings.length} finding(s) — run \`sps lint\` for detail`));
  }
  console.log("");

  console.log(chalk.bold("Adoption"));
  printAdoption("Config (.sps/config.yaml)", adoption.config_present);
  printAdoption(
    "Principles (.sps/principles.yaml)",
    adoption.principles_present,
    "Optional. Add team principles to feed `sps agent` and the MCP server."
  );
  printAdoption("Manifest (.sps/manifest.yaml)", adoption.manifest_present);
  printAdoption(
    "GitHub workflow (.github/workflows/sls.yml)",
    adoption.github_workflow_present,
    "Run `sps init --ci=github` to scaffold."
  );
  printAdoption(
    "Husky pre-push hook",
    adoption.husky_hook_present,
    "Run `sps init --ci=husky` to scaffold."
  );
  console.log("");

  if (hasIssues) {
    console.log(chalk.yellow("Some issues found. See above for details.\n"));
  } else {
    console.log(chalk.green("All clear.\n"));
  }
}

function printAdoption(label: string, ok: boolean, hint?: string) {
  if (ok) {
    console.log(chalk.green("  * ") + label);
  } else {
    console.log(chalk.dim("  - ") + chalk.dim(label));
    if (hint) console.log(chalk.dim(`        ${hint}`));
  }
}
