import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

export interface Principle {
  id: string;
  title: string;
  description: string;
}

export function loadPrinciples(repoRoot: string): Principle[] {
  const filePath = join(repoRoot, ".sps", "principles.yaml");
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = parse(content) as { principles?: Principle[] };
    return parsed?.principles ?? [];
  } catch {
    return [];
  }
}
