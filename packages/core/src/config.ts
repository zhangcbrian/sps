import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import type { SpsConfig } from "./types.js";

export const DEFAULT_CONFIG: SpsConfig = {
  version: 1,
  schema: {
    required_fields: ["spec", "title", "description", "rules"],
    required_rule_fields: [
      "id",
      "status",
      "title",
      "description",
      "given",
      "when",
      "then",
    ],
    forbidden_rule_fields: ["rule", "summary", "business_title"],
    id_format: "REQ-{DOMAIN}-{MODULE}-{NN}",
  },
  domains: {},
  categories: [
    {
      id: "business",
      label: "Business",
      description: "Affects users, revenue, or growth",
      color: "#00E5A0",
    },
    {
      id: "engineering",
      label: "Engineering",
      description: "System correctness, reliability, maintainability",
      color: "#4B9EFF",
    },
    {
      id: "security",
      label: "Security",
      description: "Data protection, abuse prevention, compliance",
      color: "#FF4B4B",
    },
  ],
  llm: {
    model: "anthropic/claude-opus-4-7",
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

export function loadConfig(repoRoot: string): SpsConfig {
  const configPath = join(repoRoot, ".sps", "config.yaml");
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const content = readFileSync(configPath, "utf-8");
  const userConfig = parse(content) as Record<string, unknown>;

  return deepMerge(
    DEFAULT_CONFIG as unknown as Record<string, unknown>,
    userConfig
  ) as unknown as SpsConfig;
}
