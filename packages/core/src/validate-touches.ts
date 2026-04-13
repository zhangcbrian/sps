import { existsSync } from "fs";
import { join } from "path";
import type { SpecFile } from "./types.js";

export interface TouchesWarning {
  specFile: string;
  touch: string;
  message: string;
}

export function validateTouches(
  specs: SpecFile[],
  repoRoot: string
): TouchesWarning[] {
  const warnings: TouchesWarning[] = [];

  for (const spec of specs) {
    for (const touch of spec.touches || []) {
      // Check common locations: src/{touch}, {touch}, packages/{touch}
      const candidates = [
        join(repoRoot, "src", touch),
        join(repoRoot, touch),
        join(repoRoot, "packages", touch),
      ];

      const exists = candidates.some((p) => existsSync(p));
      if (!exists) {
        warnings.push({
          specFile: spec.filePath,
          touch,
          message: `touches "${touch}" but no matching directory found (checked src/${touch}, ${touch}, packages/${touch})`,
        });
      }
    }
  }

  return warnings;
}
