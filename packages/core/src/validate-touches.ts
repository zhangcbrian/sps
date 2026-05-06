import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import type { SpecFile, SpsConfig } from "./types.js";

export interface TouchesWarning {
  specFile: string;
  touch: string;
  message: string;
}

const DEFAULT_ROOTS = ["src", ".", "packages"];

/**
 * Resolve the prefixes that touches paths are searched against. Order:
 *   1. config.validate?.touches_roots (if user configured)
 *   2. defaults: src, ., packages
 *   3. monorepo auto-discovery: every direct child of `apps/` and `packages/`
 *      (e.g. apps/web → apps/web, apps/web/src; packages/foo → packages/foo, packages/foo/src)
 *
 * The monorepo step is what lets specs that live under `apps/web/src/...`
 * resolve their `touches` correctly without forcing every consumer to
 * write boilerplate config.
 */
function resolveRoots(
  repoRoot: string,
  config?: SpsConfig
): string[] {
  const validate = (config as unknown as { validate?: { touches_roots?: string[] } })?.validate;
  const explicit = validate?.touches_roots;
  const base = explicit && explicit.length > 0 ? explicit : DEFAULT_ROOTS;
  const roots = new Set<string>(base);

  for (const monorepoDir of ["apps", "packages"]) {
    const fullDir = join(repoRoot, monorepoDir);
    if (!existsSync(fullDir)) continue;
    try {
      for (const entry of readdirSync(fullDir)) {
        if (entry.startsWith(".")) continue;
        const childPath = join(fullDir, entry);
        if (!statSync(childPath).isDirectory()) continue;
        roots.add(`${monorepoDir}/${entry}`);
        if (existsSync(join(childPath, "src"))) {
          roots.add(`${monorepoDir}/${entry}/src`);
        }
      }
    } catch {
      // ignore
    }
  }

  return [...roots];
}

export function validateTouches(
  specs: SpecFile[],
  repoRoot: string,
  config?: SpsConfig
): TouchesWarning[] {
  const warnings: TouchesWarning[] = [];
  const roots = resolveRoots(repoRoot, config);

  for (const spec of specs) {
    for (const touch of spec.touches || []) {
      const candidates = roots.map((root) =>
        root === "." ? join(repoRoot, touch) : join(repoRoot, root, touch)
      );

      const exists = candidates.some((p) => existsSync(p));
      if (!exists) {
        warnings.push({
          specFile: spec.filePath,
          touch,
          message: `touches "${touch}" but no matching path under any of: ${roots.join(", ")}`,
        });
      }
    }
  }

  return warnings;
}
