import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import type { SpecFile } from "./types.js";

const TEST_PATTERNS = [
  ".test.ts", ".test.js", ".test.tsx", ".test.jsx",
  ".spec.ts", ".spec.js",
  "_test.go", "_test.py",
];

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".sps",
]);

const LINEAGE_ID_PATTERN = /REQ-[A-Z]+-[A-Z]+-\d{2,}/g;

export interface CoverageResult {
  totalRules: number;
  coveredRules: number;
  coveragePercent: number;
  covered: Array<{ ruleId: string; specFile: string; title: string; testFiles: string[] }>;
  uncovered: Array<{ ruleId: string; specFile: string; title: string }>;
}

function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...findTestFiles(fullPath));
      } else if (TEST_PATTERNS.some((p) => entry.endsWith(p))) {
        files.push(fullPath);
      }
    }
  } catch {
    // directory may not exist
  }
  return files;
}

function extractIdsFromTestFiles(repoRoot: string): Map<string, string[]> {
  const idToFiles = new Map<string, string[]>();
  const testFiles = findTestFiles(repoRoot);

  for (const filePath of testFiles) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const matches = content.match(LINEAGE_ID_PATTERN);
      if (matches) {
        const relativePath = filePath.slice(repoRoot.length + 1);
        for (const id of new Set(matches)) {
          const existing = idToFiles.get(id) || [];
          existing.push(relativePath);
          idToFiles.set(id, existing);
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  return idToFiles;
}

export function analyzeCoverage(
  specs: SpecFile[],
  repoRoot: string
): CoverageResult {
  const idToTestFiles = extractIdsFromTestFiles(repoRoot);

  const allRules: Array<{ ruleId: string; specFile: string; title: string }> = [];
  for (const spec of specs) {
    for (const rule of spec.rules) {
      if (rule.id) {
        allRules.push({
          ruleId: rule.id,
          specFile: spec.filePath,
          title: rule.title,
        });
      }
    }
  }

  const covered: CoverageResult["covered"] = [];
  const uncovered: CoverageResult["uncovered"] = [];

  for (const rule of allRules) {
    const testFiles = idToTestFiles.get(rule.ruleId);
    if (testFiles && testFiles.length > 0) {
      covered.push({ ...rule, testFiles });
    } else {
      uncovered.push(rule);
    }
  }

  const totalRules = allRules.length;
  const coveredRules = covered.length;
  const coveragePercent = totalRules > 0
    ? Math.round((coveredRules / totalRules) * 100)
    : 100;

  return { totalRules, coveredRules, coveragePercent, covered, uncovered };
}
