#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { submitCommand } from "./commands/submit.js";
import { statusCommand } from "./commands/status.js";
import { validateCommand } from "./commands/validate.js";
import { scanCommand } from "./commands/scan.js";
import { agentCommand } from "./commands/agent.js";
import { coverageCommand } from "./commands/coverage.js";

const program = new Command();

program
  .name("sps")
  .description(
    "Spec, Plan, Ship — turn natural language requirements into structured, traceable specs in git"
  )
  .version("0.1.0");

program
  .command("init")
  .description("Initialize SPS in the current repo")
  .action(initCommand);

program
  .command("submit")
  .description("Submit a new requirement")
  .argument("[description]", "Feature description in natural language")
  .option("--guided", "Use guided mode (interactive conversation)")
  .option(
    "--author <email>",
    "Author email",
    process.env.USER || "unknown@sps.dev"
  )
  .action(submitCommand);

program
  .command("status")
  .description("Show spec health report")
  .argument("[dir]", "Optional directory to filter")
  .option("--gaps-only", "Only show gaps")
  .option("--json", "Output as JSON")
  .action(statusCommand);

program
  .command("validate")
  .description("Validate all specs against schema")
  .action(validateCommand);

program
  .command("scan")
  .description("Force rebuild the manifest")
  .action(scanCommand);

program
  .command("agent")
  .description("Generate AI agent instructions from specs")
  .option("-o, --output <path>", "Output file path (default: CLAUDE.md)")
  .action(agentCommand);

program
  .command("coverage")
  .description("Analyze test coverage of spec rules")
  .option("--strict", "Exit with code 1 if any rules lack test coverage")
  .action(coverageCommand);

program.parse();
