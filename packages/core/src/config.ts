import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import type { SpecflowConfig } from "./types.js";

export const DEFAULT_CONFIG: SpecflowConfig = {
  version: 1,
  specs_dir: "specs",
  schema: {
    required_top_level: ["domain", "module", "description", "rules"],
    required_rule_fields: [
      "id",
      "status",
      "summary",
      "description",
      "given",
      "when",
      "then",
    ],
    forbidden_rule_fields: ["rule"],
    id_format: "REQ-{DOMAIN}-{MODULE}-{NN}",
  },
  domains: {},
  llm: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
  },
  git: {
    branch_prefix: "spec/",
    commit_prefix: "feat(spec):",
    create_pr: true,
    pr_platform: "github",
  },
  dedup: {
    enabled: true,
    similarity_threshold: 0.7,
  },
};

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function loadConfig(repoRoot: string): SpecflowConfig {
  const configPath = join(repoRoot, ".specflow", "config.yaml");
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const content = readFileSync(configPath, "utf-8");
  const userConfig = parse(content) as Record<string, unknown>;

  return deepMerge(
    DEFAULT_CONFIG as unknown as Record<string, unknown>,
    userConfig
  ) as unknown as SpecflowConfig;
}
