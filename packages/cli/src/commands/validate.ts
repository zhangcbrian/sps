import {
  loadConfig,
  loadSpecs,
  validateSpec,
  validateTouches,
  validateUniqueness,
  validateCrossRefs,
  validateMutations,
} from "@zhangcbrian/sps-core";
import type { MutationError } from "@zhangcbrian/sps-core";
import chalk from "chalk";

interface ValidateOptions {
  against?: string;
  json?: boolean;
  strictTouches?: boolean;
}

export async function validateCommand(opts: ValidateOptions = {}) {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot);

  const schemaFailures: Array<{ file: string; errors: string[] }> = [];
  let totalSchemaErrors = 0;

  for (const spec of specs) {
    const errors = validateSpec(spec, config.schema, config.categories);
    if (errors.length > 0) {
      schemaFailures.push({ file: spec.filePath, errors });
      totalSchemaErrors += errors.length;
    }
  }

  const duplicates = validateUniqueness(specs);
  const unresolvedRefs = validateCrossRefs(specs);
  const touchesWarnings = validateTouches(specs, repoRoot, config);

  let mutations: MutationError[] = [];
  if (opts.against) {
    try {
      mutations = await validateMutations(specs, repoRoot, opts.against);
    } catch (err) {
      const message = (err as Error).message;
      if (opts.json) {
        console.log(
          JSON.stringify({
            ok: false,
            error: `Failed to load specs at ref "${opts.against}": ${message}`,
          })
        );
      } else {
        console.error(
          chalk.red(
            `Failed to load specs at ref "${opts.against}": ${message}`
          )
        );
      }
      process.exit(1);
    }
  }

  const touchesAreErrors = opts.strictTouches === true;
  const hardErrors =
    schemaFailures.length +
    duplicates.length +
    unresolvedRefs.length +
    mutations.length +
    (touchesAreErrors ? touchesWarnings.length : 0);

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          ok: hardErrors === 0,
          spec_count: specs.length,
          schema_failures: schemaFailures,
          duplicates,
          unresolved_refs: unresolvedRefs,
          mutations,
          touches_warnings: touchesWarnings,
        },
        null,
        2
      )
    );
    if (hardErrors > 0) process.exit(1);
    return;
  }

  if (hardErrors === 0) {
    const checks = ["schema", "IDs", "cross-refs"];
    if (opts.against) checks.push(`mutations vs ${opts.against}`);
    console.log(
      chalk.green(
        `* All ${specs.length} spec file(s) valid (${checks.join(", ")}).`
      )
    );
  }

  if (schemaFailures.length > 0) {
    console.error(
      chalk.red(
        `\nx Schema validation failed (${schemaFailures.length} file(s), ${totalSchemaErrors} error(s)):\n`
      )
    );
    for (const failure of schemaFailures) {
      console.error(`  ${failure.file}:`);
      for (const error of failure.errors) {
        console.error(chalk.dim(`    - ${error}`));
      }
      console.error("");
    }
  }

  if (duplicates.length > 0) {
    console.error(
      chalk.red(`\nx Duplicate rule IDs (${duplicates.length}):\n`)
    );
    for (const dup of duplicates) {
      console.error(`  ${dup.id}:`);
      for (const occ of dup.occurrences) {
        console.error(
          chalk.dim(
            `    - ${occ.specFile} (rule[${occ.ruleIndex}]: "${occ.ruleTitle}")`
          )
        );
      }
      console.error("");
    }
  }

  if (unresolvedRefs.length > 0) {
    console.error(
      chalk.red(`\nx Unresolved cross-references (${unresolvedRefs.length}):\n`)
    );
    for (const u of unresolvedRefs) {
      const fromId = u.ruleId ?? `rule[${u.ruleIndex}]`;
      console.error(
        `  ${u.specFile} ${fromId} (${u.field}): cites "${u.unresolvedRef}" but no such rule exists`
      );
    }
    console.error("");
  }

  if (mutations.length > 0) {
    console.error(
      chalk.red(
        `\nx Active rules mutated without lifecycle transition (${mutations.length}):\n`
      )
    );
    for (const m of mutations) {
      console.error(`  ${m.specFile} ${m.ruleId} (${m.field}):`);
      console.error(chalk.dim(`    before: ${truncate(m.before)}`));
      console.error(chalk.dim(`    after:  ${truncate(m.after)}`));
    }
    console.error(
      chalk.dim(
        `\n  To intentionally change behavior, mark the old rule \`status: superseded\` (with \`superseded_by:\`) and add a new rule.\n`
      )
    );
  }

  if (touchesWarnings.length > 0) {
    const label = touchesAreErrors ? "Touches errors" : "Touches warnings";
    const colorize = touchesAreErrors ? chalk.red : chalk.yellow;
    const prefix = touchesAreErrors ? "x" : "!";
    console.log(
      colorize(`\n${prefix} ${label} (${touchesWarnings.length}):\n`)
    );
    for (const w of touchesWarnings) {
      console.log(`  ${w.specFile}:`);
      console.log(chalk.dim(`    - ${w.message}`));
    }
    console.log("");
  }

  if (hardErrors > 0) {
    process.exit(1);
  }
}

function truncate(s: string, max = 120): string {
  const collapsed = s.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return collapsed.slice(0, max) + "...";
}
