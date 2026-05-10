import { submitRequirement, submitDraftFile } from "@zhangcbrian/sps-core";
import chalk from "chalk";
import { createInterface } from "readline";

interface SubmitOptions {
  author?: string;
  offline?: string;
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function submitCommand(
  description: string | undefined,
  options: SubmitOptions
) {
  const repoRoot = process.cwd();
  const author = options.author || process.env.USER || "unknown@sps.dev";

  try {
    if (options.offline) {
      const result = await submitDraftFile(repoRoot, options.offline, {
        text: description ?? `(offline draft: ${options.offline})`,
        submittedBy: author,
        source: "cli",
        mode: "quick",
      });

      console.log(chalk.green("\n* Draft submitted successfully (offline)"));
      console.log(`  File:   ${result.filePath}`);
      console.log(`  Branch: ${result.branch}`);
      console.log(`  Rules:  ${result.ruleCount}`);
      console.log("");
      return;
    }

    let text = description;
    if (!text) {
      text = await prompt(chalk.bold("Describe the feature you need:\n> "));
      if (!text) {
        console.log(chalk.red("x No description provided."));
        process.exit(1);
      }
    }

    console.log(chalk.dim("\nInterpreting requirement..."));

    const result = await submitRequirement(repoRoot, {
      text,
      submittedBy: author,
      source: "cli",
      mode: "quick",
    });

    if (result.deduplication.matches.length > 0) {
      console.log(
        chalk.yellow(
          `\nFound ${result.deduplication.matches.length} related spec(s):`
        )
      );
      for (const match of result.deduplication.matches) {
        console.log(
          `  ${match.existingRule.id} (${match.existingSpec.spec}) — ${match.relationship}`
        );
        console.log(chalk.dim(`    ${match.explanation}`));
      }
    }

    console.log(chalk.green("\n* Spec created successfully"));
    console.log(`  File:   ${result.filePath}`);
    console.log(`  Branch: ${result.branch}`);
    console.log(`  Rules:  ${result.ruleCount}`);
    console.log("");
  } catch (error) {
    console.error(
      chalk.red("x Failed to create spec:"),
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}
