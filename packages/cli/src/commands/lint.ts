import { loadSpecs, lintSpecs } from "@sls/core";
import chalk from "chalk";

interface LintOptions {
  json?: boolean;
  strict?: boolean;
}

export async function lintCommand(opts: LintOptions = {}) {
  const repoRoot = process.cwd();
  const specs = loadSpecs(repoRoot);
  const findings = lintSpecs(specs);

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          ok: findings.length === 0,
          count: findings.length,
          findings,
        },
        null,
        2
      )
    );
    if (opts.strict && findings.length > 0) process.exit(1);
    return;
  }

  if (findings.length === 0) {
    console.log(chalk.green(`* No lint findings across ${specs.length} spec file(s).`));
    return;
  }

  const byCategory = new Map<string, typeof findings>();
  for (const f of findings) {
    const list = byCategory.get(f.category) ?? [];
    list.push(f);
    byCategory.set(f.category, list);
  }

  console.log(`\nSPS Lint`);
  console.log(`========`);
  console.log(`${findings.length} finding(s) across ${specs.length} spec file(s).\n`);

  for (const [category, list] of byCategory) {
    const colorize = list[0].severity === "warn" ? chalk.yellow : chalk.dim;
    console.log(colorize(chalk.bold(`${category} (${list.length})`)));
    for (const f of list) {
      const id = f.ruleId ?? "(spec)";
      console.log(`  ${id.padEnd(32)} ${f.rule}`);
      console.log(chalk.dim(`    ${f.specFile}`));
      console.log(chalk.dim(`    ${f.message}`));
    }
    console.log("");
  }

  if (opts.strict) process.exit(1);
}
