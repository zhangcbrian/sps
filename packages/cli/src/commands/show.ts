import { loadSpecs } from "@sls/core";
import type { SpecRule, SpecFile } from "@sls/core";
import chalk from "chalk";

interface ShowOptions {
  json?: boolean;
}

export function showCommand(id: string, opts: ShowOptions = {}) {
  const repoRoot = process.cwd();
  const specs = loadSpecs(repoRoot);

  let match: { spec: SpecFile; rule: SpecRule } | null = null;
  for (const spec of specs) {
    for (const rule of spec.rules) {
      if (rule.id === id) {
        match = { spec, rule };
        break;
      }
    }
    if (match) break;
  }

  if (!match) {
    if (opts.json) {
      console.log(JSON.stringify({ ok: false, error: `Rule "${id}" not found.` }));
    } else {
      console.error(chalk.red(`Rule "${id}" not found.`));
    }
    process.exit(1);
  }

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          specFile: match.spec.filePath,
          spec: match.spec.spec,
          rule: match.rule,
        },
        null,
        2
      )
    );
    return;
  }

  const r = match.rule;
  const statusColor =
    r.status === "active"
      ? chalk.green
      : r.status === "proposed"
        ? chalk.yellow
        : chalk.dim;

  console.log(`${chalk.bold(r.id ?? "(no id)")} ${statusColor(`[${r.status}]`)} ${chalk.dim(r.category ?? "")}`);
  console.log(`${r.title ?? ""}`);
  console.log(chalk.dim(match.spec.filePath));
  console.log("");

  printField("description", r.description);
  printField("given", r.given);
  printField("when", r.when);
  printField("then", r.then);

  if (r.behavior) {
    console.log(chalk.bold("  behavior"));
    console.log(`    surface: ${r.behavior.surface}`);
    if (r.behavior.inputs && Object.keys(r.behavior.inputs).length > 0) {
      console.log(`    inputs:`);
      for (const [k, v] of Object.entries(r.behavior.inputs)) {
        console.log(`      ${k}: ${v}`);
      }
    }
    if (r.behavior.outputs && Object.keys(r.behavior.outputs).length > 0) {
      console.log(`    outputs:`);
      for (const [k, v] of Object.entries(r.behavior.outputs)) {
        console.log(`      ${k}: ${v}`);
      }
    }
    if (r.behavior.invariants && r.behavior.invariants.length > 0) {
      console.log(`    invariants:`);
      for (const inv of r.behavior.invariants) {
        console.log(`      - ${inv}`);
      }
    }
    if (r.behavior.errors && r.behavior.errors.length > 0) {
      console.log(`    errors:`);
      for (const e of r.behavior.errors) {
        console.log(`      ${e.code}: ${e.when}`);
      }
    }
    console.log("");
  }

  if (r.superseded_by) {
    console.log(chalk.bold("  superseded by"));
    console.log(`    ${r.superseded_by}`);
    console.log("");
  }

  if (r.notes) {
    printField("notes", r.notes);
  }

  if (r.edge_cases && r.edge_cases.length > 0) {
    console.log(chalk.bold("  edge cases"));
    for (const ec of r.edge_cases) {
      console.log(`    - ${ec.case}`);
      console.log(chalk.dim(`        → ${ec.decision}`));
    }
    console.log("");
  }

  if (r.tests && r.tests.length > 0) {
    console.log(chalk.bold("  tests"));
    for (const t of r.tests) console.log(`    ${t}`);
    console.log("");
  }
}

function printField(label: string, value: string | undefined) {
  if (!value) return;
  const trimmed = value.trim();
  if (trimmed.length === 0) return;
  console.log(chalk.bold(`  ${label}`));
  for (const line of trimmed.split("\n")) {
    console.log(`    ${line}`);
  }
  console.log("");
}
