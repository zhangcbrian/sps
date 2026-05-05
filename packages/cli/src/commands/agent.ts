import { loadSpecs, generateAgentInstructions, loadPrinciples } from "@specflow/core";
import { writeFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";

export async function agentCommand(options: { output?: string }) {
  const repoRoot = process.cwd();
  const specs = loadSpecs(repoRoot);
  const principles = loadPrinciples(repoRoot);

  const content = generateAgentInstructions(specs, principles);

  const outputPath = options.output || join(repoRoot, "CLAUDE.md");
  writeFileSync(outputPath, content, "utf-8");

  const activeRules = specs.flatMap((s) =>
    s.rules.filter((r) => r.status === "active" || r.status === "proposed")
  );

  console.log(chalk.green("*"), `Agent instructions written to ${outputPath.replace(repoRoot + "/", "")}`);
  console.log(`  Specs:      ${specs.length}`);
  console.log(`  Rules:      ${activeRules.length}`);
  console.log(`  Principles: ${principles.length}`);
  console.log("");
}
