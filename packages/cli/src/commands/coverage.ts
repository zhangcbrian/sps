import { loadSpecs, analyzeCoverage } from "@sls/core";
import chalk from "chalk";

interface CoverageOptions {
  strict?: boolean;
  json?: boolean;
}

export async function coverageCommand(options: CoverageOptions = {}) {
  const repoRoot = process.cwd();
  const specs = loadSpecs(repoRoot);
  const result = analyzeCoverage(specs, repoRoot);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          ok: !options.strict || result.uncovered.length === 0,
          ...result,
        },
        null,
        2
      )
    );
    if (options.strict && result.uncovered.length > 0) {
      process.exit(1);
    }
    return;
  }

  console.log("\nSPS Test Coverage Report");
  console.log("========================");
  console.log(`Total rules:     ${result.totalRules}`);
  console.log(`Covered:         ${chalk.green(result.coveredRules)} (${result.coveragePercent}%)`);
  console.log(`Uncovered:       ${result.uncovered.length > 0 ? chalk.red(result.uncovered.length) : 0}`);
  console.log("");

  if (result.uncovered.length > 0) {
    console.log(chalk.yellow("Uncovered rules:"));
    for (const r of result.uncovered) {
      console.log(`  ${chalk.dim(r.ruleId.padEnd(30))} ${r.title}`);
      console.log(`  ${chalk.dim("".padEnd(30))} ${chalk.dim(r.specFile)}`);
    }
    console.log("");
  }

  if (result.covered.length > 0 && result.uncovered.length === 0) {
    console.log(chalk.green("All spec rules have test coverage."));
    console.log("");
  }

  if (options.strict && result.uncovered.length > 0) {
    process.exit(1);
  }
}
