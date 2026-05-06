import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  loadSpecs,
  loadPrinciples,
  analyzeCoverage,
  diffSpecs,
} from "@specflow/core";
import type { SpecFile, SpecRule } from "@specflow/core";
import { z } from "zod";

interface RuleSummary {
  ruleId: string;
  specFile: string;
  spec: string;
  title: string;
  status: string;
  category: string;
}

function summarize(spec: SpecFile, rule: SpecRule): RuleSummary | null {
  if (!rule.id) return null;
  return {
    ruleId: rule.id,
    specFile: spec.filePath,
    spec: spec.spec,
    title: rule.title ?? "",
    status: String(rule.status ?? ""),
    category: String(rule.category ?? ""),
  };
}

function jsonText(value: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(value, null, 2) },
    ],
  };
}

/**
 * Build an MCP server that exposes the spec corpus rooted at `repoRoot`.
 * Exported for testability — `mcpCommand` is the thin CLI wrapper.
 */
export function buildMcpServer(repoRoot: string): McpServer {
  const server = new McpServer(
    { name: "specflow", version: "0.2.0" },
    {
      instructions:
        "specflow exposes structured spec rules from the current repo. Use list_rules / search_rules to find work, then get_rule for full context. find_rules_by_touches scopes to a file path. coverage_for_path reports which rules a test path covers. diff_specs surfaces what a branch changes vs a git ref.",
    }
  );

  server.registerTool(
    "list_rules",
    {
      title: "List rules",
      description:
        "List rules across the spec corpus, optionally filtered by status and/or category. Returns one summary line per rule.",
      inputSchema: {
        status: z.string().optional(),
        category: z.string().optional(),
      },
    },
    async ({ status, category }) => {
      const specs = loadSpecs(repoRoot);
      const rules: RuleSummary[] = [];
      for (const spec of specs) {
        for (const rule of spec.rules) {
          const summary = summarize(spec, rule);
          if (!summary) continue;
          if (status && summary.status !== status) continue;
          if (category && summary.category !== category) continue;
          rules.push(summary);
        }
      }
      return jsonText({ count: rules.length, rules });
    }
  );

  server.registerTool(
    "get_rule",
    {
      title: "Get rule",
      description:
        "Return one rule's full payload (title, status, given/when/then, behavior block, edge cases, tests, supersededBy) by lineage ID.",
      inputSchema: {
        ruleId: z.string(),
      },
    },
    async ({ ruleId }) => {
      const specs = loadSpecs(repoRoot);
      for (const spec of specs) {
        for (const rule of spec.rules) {
          if (rule.id === ruleId) {
            return jsonText({
              ok: true,
              specFile: spec.filePath,
              spec: spec.spec,
              rule,
            });
          }
        }
      }
      return jsonText({ ok: false, error: `Rule "${ruleId}" not found.` });
    }
  );

  server.registerTool(
    "list_specs",
    {
      title: "List spec files",
      description:
        "List every spec file in the corpus with its rule count and category mix.",
      inputSchema: {},
    },
    async () => {
      const specs = loadSpecs(repoRoot);
      const summaries = specs.map((s) => ({
        specFile: s.filePath,
        spec: s.spec,
        title: s.title,
        ruleCount: s.rules.length,
        statuses: countBy(s.rules, (r) => String(r.status ?? "")),
      }));
      return jsonText({ count: summaries.length, specs: summaries });
    }
  );

  server.registerTool(
    "find_rules_by_touches",
    {
      title: "Find rules by touched path",
      description:
        "Return every rule whose spec's `touches` list overlaps with a given file or directory path. Common repo roots (src/, apps/<name>/src/, packages/<name>/src/) are stripped before comparing, so passing a real file path like `apps/web/src/server/routers/events.ts` matches a touch entry of `src/server/routers/events.ts` (or `events.ts`, etc.).",
      inputSchema: {
        path: z.string(),
      },
    },
    async ({ path }) => {
      const specs = loadSpecs(repoRoot);
      const matches: Array<RuleSummary & { matchedTouch: string }> = [];
      for (const spec of specs) {
        for (const touch of spec.touches ?? []) {
          if (pathOverlaps(touch, path)) {
            for (const rule of spec.rules) {
              const summary = summarize(spec, rule);
              if (!summary) continue;
              matches.push({ ...summary, matchedTouch: touch });
            }
            break;
          }
        }
      }
      return jsonText({ count: matches.length, rules: matches });
    }
  );

  server.registerTool(
    "search_rules",
    {
      title: "Search rules",
      description:
        "Substring search over rule title, description, given, when, then. Case-insensitive. Returns ranked summaries.",
      inputSchema: {
        query: z.string(),
        limit: z.number().int().positive().max(100).optional(),
      },
    },
    async ({ query, limit }) => {
      const specs = loadSpecs(repoRoot);
      const needle = query.toLowerCase();
      const hits: Array<RuleSummary & { score: number }> = [];
      for (const spec of specs) {
        for (const rule of spec.rules) {
          const summary = summarize(spec, rule);
          if (!summary) continue;
          let score = 0;
          if (summary.title.toLowerCase().includes(needle)) score += 4;
          if ((rule.description ?? "").toLowerCase().includes(needle))
            score += 2;
          if (
            (rule.given ?? "").toLowerCase().includes(needle) ||
            (rule.when ?? "").toLowerCase().includes(needle) ||
            (rule.then ?? "").toLowerCase().includes(needle)
          ) {
            score += 1;
          }
          if (score > 0) hits.push({ ...summary, score });
        }
      }
      hits.sort((a, b) => b.score - a.score || a.ruleId.localeCompare(b.ruleId));
      const result = limit ? hits.slice(0, limit) : hits;
      return jsonText({ count: result.length, hits: result });
    }
  );

  server.registerTool(
    "coverage_for_path",
    {
      title: "Coverage for a test path",
      description:
        "Run coverage analysis and return only the rules whose covering tests include the given path. Use to verify a change has spec backing.",
      inputSchema: {
        path: z.string(),
      },
    },
    async ({ path }) => {
      const specs = loadSpecs(repoRoot);
      const result = analyzeCoverage(specs, repoRoot);
      const matches = result.covered.filter((c) =>
        c.testFiles.some((f) => f.includes(path))
      );
      return jsonText({ count: matches.length, covered: matches });
    }
  );

  server.registerTool(
    "diff_specs",
    {
      title: "Diff specs against a git ref",
      description:
        "Spec-level diff between HEAD and a git ref. Returns added / removed / modified / transitioned rules plus file moves.",
      inputSchema: {
        ref: z.string().optional(),
      },
    },
    async ({ ref }) => {
      const specs = loadSpecs(repoRoot);
      try {
        const diff = await diffSpecs(specs, repoRoot, ref ?? "origin/main");
        return jsonText({ ok: true, ...diff });
      } catch (err) {
        return jsonText({ ok: false, error: (err as Error).message });
      }
    }
  );

  server.registerTool(
    "get_principles",
    {
      title: "Get team principles",
      description:
        "Return the list of team principles from .sps/principles.yaml. Use these as the always-on guardrails for any change.",
      inputSchema: {},
    },
    async () => {
      const principles = loadPrinciples(repoRoot);
      return jsonText({ count: principles.length, principles });
    }
  );

  return server;
}

export async function mcpCommand() {
  const server = buildMcpServer(process.cwd());
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/**
 * True when `touch` (as written in a spec's touches list) refers to the
 * same path or directory as `query` (a real file/dir path the agent
 * passes in). Strips common monorepo roots from the query so a touch of
 * "billing" still matches a query of "src/billing/invoice.ts" or
 * "apps/web/src/billing".
 */
export function pathOverlaps(touch: string, query: string): boolean {
  const candidates = pathCandidates(query);
  for (const candidate of candidates) {
    if (overlapStrict(touch, candidate)) return true;
  }
  return false;
}

function overlapStrict(a: string, b: string): boolean {
  if (a === b) return true;
  if (b.startsWith(a + "/")) return true;
  if (a.startsWith(b + "/")) return true;
  return false;
}

function pathCandidates(path: string): string[] {
  const candidates = new Set<string>([path]);

  // Drop a leading `src/` so a touch of "billing" matches a query of
  // "src/billing/invoice.ts" via the billing/ prefix.
  if (path.startsWith("src/")) {
    candidates.add(path.slice(4));
  }

  // Workspace-aware stripping: a query like "packages/billing/src/x.ts"
  // (or "apps/web/src/billing/invoice.ts") is a path inside a workspace
  // package. Generate candidates that:
  //   - drop the workspace prefix only ("packages/" or "apps/"), keeping
  //     the package name attached: "billing/src/x.ts"
  //   - additionally drop a nested "src/", giving "billing/x.ts"
  //   - drop everything before the inner path: "src/x.ts" / "x.ts"
  //   - expose the bare workspace package name: "billing" (which lets a
  //     touch entry of just "billing" match any file under it)
  const workspaceMatch = path.match(/^(?:apps|packages)\/([^/]+)(?:\/(.+))?$/);
  if (workspaceMatch) {
    const pkgName = workspaceMatch[1];
    const subPath = workspaceMatch[2];
    candidates.add(pkgName);
    if (subPath) {
      candidates.add(`${pkgName}/${subPath}`);
      candidates.add(subPath);
      const subStripped = subPath.replace(/^src\//, "");
      if (subStripped !== subPath) {
        candidates.add(`${pkgName}/${subStripped}`);
        candidates.add(subStripped);
      }
    }
  }

  return [...candidates];
}
