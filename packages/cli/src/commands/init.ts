import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { stringify } from "yaml";
import { DEFAULT_CONFIG } from "@sps/core";
import chalk from "chalk";

export async function initCommand() {
  const repoRoot = process.cwd();
  const configDir = join(repoRoot, ".sps");
  const configPath = join(configDir, "config.yaml");

  if (existsSync(configPath)) {
    console.log(
      chalk.yellow("! .sps/config.yaml already exists. Skipping.")
    );
    return;
  }

  mkdirSync(configDir, { recursive: true });
  const configContent = stringify(DEFAULT_CONFIG, { lineWidth: 80 });
  writeFileSync(configPath, configContent, "utf-8");
  console.log(chalk.green("*"), "Created .sps/config.yaml");

  console.log(
    `\n${chalk.bold("SPS initialized.")} Drop .sps.yaml files next to your code to start writing specs.\nRun ${chalk.dim("sps scan")} to build the manifest.\n`
  );
}
