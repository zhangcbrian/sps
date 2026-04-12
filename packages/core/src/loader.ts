import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { parse } from "yaml";
import type { SpecFile } from "./types.js";

function findYamlFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith("_")) continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...findYamlFiles(fullPath));
      } else if (entry.endsWith(".yaml") || entry.endsWith(".yml")) {
        files.push(fullPath);
      }
    }
  } catch {
    // directory may not exist
  }
  return files;
}

export function loadSpecs(repoRoot: string, specsDir: string): SpecFile[] {
  const fullDir = join(repoRoot, specsDir);
  const files = findYamlFiles(fullDir);
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
