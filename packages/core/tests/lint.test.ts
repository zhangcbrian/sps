import { describe, it, expect } from "vitest";
import { lintSpecs } from "../src/lint.js";
import type { SpecFile, SpecRule } from "../src/types.js";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const baseRule: SpecRule = {
  id: "REQ-X-Y-01",
  title: "rule",
  status: "active",
  category: "business",
  description: "short",
  given: "g",
  when: "w",
  then: "t",
  examples: [],
  edge_cases: [],
  tests: [],
};

const wrap = (rules: SpecRule[], filePath = "src/x/x.sps.yaml"): SpecFile => ({
  spec: "x/x",
  title: "X",
  description: "",
  category: "business",
  touches: [],
  rules,
  filePath,
});

describe("lintSpecs", () => {
  it("returns no findings for a small healthy spec", () => {
    expect(lintSpecs([wrap([baseRule])])).toEqual([]);
  });

  it("flags rules whose description exceeds the word limit", () => {
    const longDescription = "word ".repeat(220);
    const findings = lintSpecs([
      wrap([{ ...baseRule, description: longDescription }]),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("rule_too_long");
    expect(findings[0].ruleId).toBe("REQ-X-Y-01");
  });

  it("respects custom maxDescriptionWords", () => {
    const findings = lintSpecs([
      wrap([{ ...baseRule, description: "one two three four five six seven" }]),
    ], { maxDescriptionWords: 5 });
    expect(findings).toHaveLength(1);
  });

  it("flags specs with too many rules", () => {
    const rules = Array.from({ length: 35 }, (_, i) => ({
      ...baseRule,
      id: `REQ-X-Y-${String(i + 1).padStart(2, "0")}`,
    }));
    const findings = lintSpecs([wrap(rules)]);
    expect(findings.some((f) => f.category === "spec_too_many_rules")).toBe(true);
  });

  it("flags behavioral titles without a behavior block", () => {
    const findings = lintSpecs([
      wrap([{ ...baseRule, title: "User update API endpoint" }]),
    ]);
    expect(findings.some((f) => f.category === "missing_behavior_block")).toBe(
      true
    );
  });

  it("does not flag a behavioral title when behavior is present", () => {
    const findings = lintSpecs([
      wrap([
        {
          ...baseRule,
          title: "User update API endpoint",
          behavior: { surface: "trpc.users.update" },
        },
      ]),
    ]);
    expect(findings.filter((f) => f.category === "missing_behavior_block")).toEqual([]);
  });

  it("does not flag a structural title without behavior", () => {
    const findings = lintSpecs([
      wrap([{ ...baseRule, title: "Schema shape — users table" }]),
    ]);
    expect(findings.filter((f) => f.category === "missing_behavior_block")).toEqual([]);
  });

  it("skips removed rules for missing-behavior check", () => {
    const findings = lintSpecs([
      wrap([
        {
          ...baseRule,
          status: "removed" as const,
          title: "User update API endpoint",
        },
      ]),
    ]);
    expect(findings.filter((f) => f.category === "missing_behavior_block")).toEqual([]);
  });

  it("flags rules whose description contains a forbidden pattern", () => {
    const findings = lintSpecs([
      wrap([{ ...baseRule, description: "see #566 for context" }]),
    ]);
    expect(
      findings.filter((f) => f.category === "forbidden_pattern_in_description")
    ).toHaveLength(1);
  });

  it("emits one finding per rule even when multiple patterns match", () => {
    const findings = lintSpecs([
      wrap([{ ...baseRule, description: "see #566 and TKT-123 in Phase 2" }]),
    ]);
    expect(
      findings.filter((f) => f.category === "forbidden_pattern_in_description")
    ).toHaveLength(1);
  });

  it("does not scan notes for forbidden patterns", () => {
    const findings = lintSpecs([
      wrap([
        { ...baseRule, description: "clean prose", notes: "history: see #566" },
      ]),
    ]);
    expect(
      findings.filter((f) => f.category === "forbidden_pattern_in_description")
    ).toEqual([]);
  });

  it("respects empty forbiddenPatterns to disable the check", () => {
    const findings = lintSpecs(
      [wrap([{ ...baseRule, description: "see #566" }])],
      { forbiddenPatterns: [] }
    );
    expect(
      findings.filter((f) => f.category === "forbidden_pattern_in_description")
    ).toEqual([]);
  });

  it("flags spec files whose on-disk line count exceeds the threshold", () => {
    const findings = lintSpecs(
      [wrap([baseRule], "src/big.sps.yaml")],
      { fileLineCounts: new Map([["src/big.sps.yaml", 801]]) }
    );
    expect(
      findings.filter((f) => f.category === "spec_file_too_large")
    ).toHaveLength(1);
  });

  it("does not flag at or below the file-line threshold", () => {
    const findings = lintSpecs(
      [wrap([baseRule], "src/ok.sps.yaml")],
      { fileLineCounts: new Map([["src/ok.sps.yaml", 800]]) }
    );
    expect(
      findings.filter((f) => f.category === "spec_file_too_large")
    ).toEqual([]);
  });

  it("respects maxSpecFileLines: 0 to disable the file-size check", () => {
    const findings = lintSpecs(
      [wrap([baseRule], "src/huge.sps.yaml")],
      {
        fileLineCounts: new Map([["src/huge.sps.yaml", 5000]]),
        maxSpecFileLines: 0,
      }
    );
    expect(
      findings.filter((f) => f.category === "spec_file_too_large")
    ).toEqual([]);
  });

  it("skips file-size check silently when the file cannot be read", () => {
    const findings = lintSpecs([
      wrap([baseRule], "src/does-not-exist.sps.yaml"),
    ]);
    expect(
      findings.filter((f) => f.category === "spec_file_too_large")
    ).toEqual([]);
  });

  it("counts on-disk lines using wc -l semantics (no off-by-one for trailing newline)", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-lint-"));
    const filePath = join(dir, "exactly-800.sps.yaml");
    // 800 lines, each terminated with \n — wc -l reports 800.
    writeFileSync(filePath, "x\n".repeat(800));
    const spec = wrap([baseRule], filePath);
    const findings = lintSpecs([spec]);
    expect(
      findings.filter((f) => f.category === "spec_file_too_large")
    ).toEqual([]);
  });

  it("flags when on-disk lines exceed the threshold (wc -l semantics)", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-lint-"));
    const filePath = join(dir, "801-lines.sps.yaml");
    writeFileSync(filePath, "x\n".repeat(801));
    const spec = wrap([baseRule], filePath);
    const findings = lintSpecs([spec]);
    const matches = findings.filter(
      (f) => f.category === "spec_file_too_large"
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].message).toContain("801 lines");
  });
});
