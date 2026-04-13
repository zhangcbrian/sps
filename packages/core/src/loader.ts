import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { parse } from "yaml";
import type { SpecFile } from "./types.js";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".sps",
]);

function findSpsFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...findSpsFiles(fullPath));
      } else if (entry.endsWith(".sps.yaml")) {
        files.push(fullPath);
      }
    }
  } catch {
    // directory may not exist
  }
  return files;
}

export function loadSpecs(repoRoot: string): SpecFile[] {
  const files = findSpsFiles(repoRoot);
  return files
    .map((filePath) => {
      const content = readFileSync(filePath, "utf-8");
      const parsed = parse(content);
      if (!parsed || !parsed.rules) return null;
      return {
        ...parsed,
        filePath: relative(repoRoot, filePath),
      } as SpecFile;
    })
    .filter((s): s is SpecFile => s !== null);
}
