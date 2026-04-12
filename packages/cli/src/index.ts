#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { submitCommand } from "./commands/submit.js";
import { statusCommand } from "./commands/status.js";
import { validateCommand } from "./commands/validate.js";

const program = new Command();

program
  .name("specflow")
  .description(
    "Turn natural language requirements into structured, traceable specs in git"
  )
  .version("0.1.0");

program
  .command("init")
  .description("Initialize specflow in the current repo")
  .action(initCommand);

program
  .command("submit")
  .description("Submit a new requirement")
  .argument("[description]", "Feature description in natural language")
  .option("--guided", "Use guided mode (interactive conversation)")
  .option(
    "--author <email>",
    "Author email",
    process.env.USER || "unknown@specflow.dev"
  )
  .action(submitCommand);

program
  .command("status")
  .description("Show spec health report")
  .option("--gaps-only", "Only show gaps")
  .action(statusCommand);

program
  .command("validate")
  .description("Validate all specs against schema")
  .action(validateCommand);

program.parse();
