#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { submitCommand } from "./commands/submit.js";
import { statusCommand } from "./commands/status.js";
import { validateCommand } from "./commands/validate.js";
import { scanCommand } from "./commands/scan.js";
import { agentCommand } from "./commands/agent.js";
import { coverageCommand } from "./commands/coverage.js";
import { doctorCommand } from "./commands/doctor.js";
import { showCommand } from "./commands/show.js";
import { diffCommand } from "./commands/diff.js";
import { mcpCommand } from "./commands/mcp.js";

const program = new Command();

program
  .name("sps")
  .description(
    "specflow — turn natural language requirements into structured, traceable specs in git"
  )
  .version("0.2.0");

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
  .description("Validate all specs (schema, ID uniqueness, cross-refs, optional mutation check)")
  .option("--against <ref>", "Compare against a git ref to detect active-rule mutations (e.g. origin/main)")
  .option("--json", "Output as JSON")
  .action(validateCommand);

program
  .command("scan")
  .description("Force rebuild the manifest")
  .option("--json", "Output manifest as JSON")
  .action(scanCommand);

program
  .command("show")
  .description("Print one rule compactly (ideal for agent context loading)")
  .argument("<id>", "Rule lineage ID, e.g. REQ-CHECKOUT-COUPON-01")
  .option("--json", "Output as JSON")
  .action(showCommand);

program
  .command("diff")
  .description("Show rules added/modified/transitioned/removed between HEAD and a git ref")
  .argument("[ref]", "Git ref to compare against (default: origin/main)")
  .option("--json", "Output as JSON")
  .action(diffCommand);

program
  .command("agent")
  .description("Generate AI agent instructions from specs")
  .option("-o, --output <path>", "Output file path (default: CLAUDE.md)")
  .option("--json", "Output a JSON summary instead of human-readable text")
  .action(agentCommand);

program
  .command("coverage")
  .description("Analyze test coverage of spec rules")
  .option("--strict", "Exit with code 1 if any rules lack test coverage")
  .option("--json", "Output as JSON")
  .action(coverageCommand);

program
  .command("doctor")
  .description("Run a full health check: validate, coverage, scan")
  .option("--json", "Output as JSON")
  .action(doctorCommand);

program
  .command("mcp")
  .description(
    "Run an MCP stdio server exposing the spec corpus to agents (Claude Code, Codex, Cursor, etc.)"
  )
  .action(mcpCommand);

program.parse();
