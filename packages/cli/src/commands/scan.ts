import { loadConfig, loadSpecs, buildManifest } from "@specflow/core";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { stringify } from "yaml";
import chalk from "chalk";

export async function scanCommand(options: { json?: boolean } = {}) {
  const repoRoot = process.cwd();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot);
  const manifest = buildManifest(specs, config);

  const spsDir = join(repoRoot, ".sps");
  mkdirSync(spsDir, { recursive: true });

  const header = "# AUTO-GENERATED — do not edit. Run `sps scan` to refresh.\n\n";
  const content = header + stringify(manifest, { lineWidth: 100 });
  writeFileSync(join(spsDir, "manifest.yaml"), content, "utf-8");

  if (options.json) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  console.log(chalk.green("*"), "Manifest rebuilt");
  console.log(`  Files: ${manifest.totals.files}`);
  console.log(`  Rules: ${manifest.totals.rules}`);

  if (manifest.drift.length > 0) {
    console.log(chalk.yellow(`\n  Drift detected (${manifest.drift.length}):`));
    for (const d of manifest.drift) {
      console.log(chalk.dim(`    ${d.path}: ${d.issue}`));
    }
  }

  console.log("");
}
