import { loadConfig, loadSpecs, lintSpecs } from "@sls/core";
import type { LintConfig, LintOptions } from "@sls/core";
import chalk from "chalk";

interface CliLintOptions {
  json?: boolean;
  strict?: boolean;
}

function lintConfigToOptions(config: LintConfig | undefined): LintOptions {
  if (!config) return {};
  const options: LintOptions = {};
  if (config.max_description_words !== undefined) {
    options.maxDescriptionWords = config.max_description_words;
  }
  if (config.max_rules_per_spec !== undefined) {
    options.maxRulesPerSpec = config.max_rules_per_spec;
  }
  if (config.max_spec_file_lines !== undefined) {
    options.maxSpecFileLines = config.max_spec_file_lines;
  }
  if (config.forbidden_patterns !== undefined) {
    options.forbiddenPatterns = config.forbidden_patterns;
  }
  if (config.behavioral_keywords !== undefined) {
    options.behavioralKeywords = config.behavioral_keywords;
  }
  return options;
}

export async function lintCommand(opts: CliLintOptions = {}) {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot);
  const findings = lintSpecs(specs, lintConfigToOptions(config.lint));

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
    console.log(
      chalk.green(`* No lint findings across ${specs.length} spec file(s).`)
    );
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
  console.log(
    `${findings.length} finding(s) across ${specs.length} spec file(s).\n`
  );

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
