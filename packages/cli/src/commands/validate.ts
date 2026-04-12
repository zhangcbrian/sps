import { loadConfig, loadSpecs, validateSpec } from "@specflow/core";
import chalk from "chalk";

export async function validateCommand() {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot, config.specs_dir);

  let totalErrors = 0;
  const failures: Array<{ file: string; errors: string[] }> = [];

  for (const spec of specs) {
    const errors = validateSpec(spec, config.schema);
    if (errors.length > 0) {
      failures.push({ file: spec.filePath, errors });
      totalErrors += errors.length;
    }
  }

  if (failures.length === 0) {
    console.log(
      chalk.green(`✓ All ${specs.length} spec file(s) conform to schema.`)
    );
    return;
  }

  console.error(
    chalk.red(
      `\n✗ Schema validation failed (${failures.length} file(s), ${totalErrors} error(s)):\n`
    )
  );
  for (const failure of failures) {
    console.error(`  ${failure.file}:`);
    for (const error of failure.errors) {
      console.error(chalk.dim(`    - ${error}`));
    }
    console.error("");
  }
  process.exit(1);
}
