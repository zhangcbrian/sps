import { loadConfig, loadSpecs, validateSpec, validateTouches } from "@sps/core";
import chalk from "chalk";

export async function validateCommand() {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot);

  let totalErrors = 0;
  const failures: Array<{ file: string; errors: string[] }> = [];

  for (const spec of specs) {
    const errors = validateSpec(spec, config.schema);
    if (errors.length > 0) {
      failures.push({ file: spec.filePath, errors });
      totalErrors += errors.length;
    }
  }

  // Validate touches references
  const touchesWarnings = validateTouches(specs, repoRoot);

  if (failures.length === 0) {
    console.log(
      chalk.green(`* All ${specs.length} spec file(s) conform to schema.`)
    );
  } else {
    console.error(
      chalk.red(
        `\nx Schema validation failed (${failures.length} file(s), ${totalErrors} error(s)):\n`
      )
    );
    for (const failure of failures) {
      console.error(`  ${failure.file}:`);
      for (const error of failure.errors) {
        console.error(chalk.dim(`    - ${error}`));
      }
      console.error("");
    }
  }

  if (touchesWarnings.length > 0) {
    console.log(chalk.yellow(`\n! Touches warnings (${touchesWarnings.length}):\n`));
    for (const w of touchesWarnings) {
      console.log(`  ${w.specFile}:`);
      console.log(chalk.dim(`    - ${w.message}`));
    }
    console.log("");
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}
