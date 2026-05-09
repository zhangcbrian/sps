import { loadSpecs, diffSpecs } from "@sps/core";
import chalk from "chalk";

interface DiffOptions {
  json?: boolean;
}

export async function diffCommand(
  refArg: string | undefined,
  opts: DiffOptions = {}
) {
  const repoRoot = process.cwd();
  const ref = refArg ?? "origin/main";
  const specs = loadSpecs(repoRoot);

  let diff;
  try {
    diff = await diffSpecs(specs, repoRoot, ref);
  } catch (err) {
    if (opts.json) {
      console.log(JSON.stringify({ ok: false, error: (err as Error).message }));
    } else {
      console.error(
        chalk.red(`Failed to load specs at ref "${ref}": ${(err as Error).message}`)
      );
    }
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify({ ok: true, ...diff }, null, 2));
    return;
  }

  const total =
    diff.added.length +
    diff.modified.length +
    diff.transitioned.length +
    diff.removed.length;

  console.log(chalk.bold(`Spec diff: HEAD vs ${ref}`));
  console.log("");

  if (total === 0 && diff.files_added.length === 0 && diff.files_removed.length === 0) {
    console.log(chalk.dim("  (no spec changes)"));
    console.log("");
    return;
  }

  if (diff.added.length > 0) {
    console.log(chalk.green(chalk.bold(`+ Added (${diff.added.length})`)));
    for (const r of diff.added) {
      console.log(
        `  ${pad(r.ruleId, 32)} ${r.title} ${chalk.dim(`[${r.status}]`)}`
      );
    }
    console.log("");
  }

  if (diff.modified.length > 0) {
    console.log(chalk.yellow(chalk.bold(`~ Modified (${diff.modified.length})`)));
    for (const r of diff.modified) {
      console.log(
        `  ${pad(r.ruleId, 32)} ${r.title} ${chalk.dim(`[${r.fields.join(", ")}]`)}`
      );
    }
    console.log("");
  }

  if (diff.transitioned.length > 0) {
    console.log(
      chalk.cyan(chalk.bold(`> Status transitions (${diff.transitioned.length})`))
    );
    for (const r of diff.transitioned) {
      const tail = r.supersededBy ? ` ${chalk.dim(`→ ${r.supersededBy}`)}` : "";
      console.log(
        `  ${pad(r.ruleId, 32)} ${r.title} ${chalk.dim(`[${r.fromStatus} → ${r.toStatus}]`)}${tail}`
      );
    }
    console.log("");
  }

  if (diff.removed.length > 0) {
    console.log(chalk.red(chalk.bold(`- Removed (${diff.removed.length})`)));
    for (const r of diff.removed) {
      console.log(`  ${pad(r.ruleId, 32)} ${r.title}`);
    }
    console.log("");
  }

  if (diff.files_added.length > 0 || diff.files_removed.length > 0) {
    console.log(chalk.bold("Files"));
    for (const f of diff.files_added) console.log(chalk.green(`  + ${f}`));
    for (const f of diff.files_removed) console.log(chalk.red(`  - ${f}`));
    console.log("");
  }
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}
