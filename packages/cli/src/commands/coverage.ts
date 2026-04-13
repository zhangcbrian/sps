import { loadSpecs, analyzeCoverage } from "@sps/core";
import chalk from "chalk";

export async function coverageCommand(options: { strict?: boolean }) {
  const repoRoot = process.cwd();
  const specs = loadSpecs(repoRoot);
  const result = analyzeCoverage(specs, repoRoot);

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
