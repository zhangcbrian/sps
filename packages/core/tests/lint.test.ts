import { describe, it, expect } from "vitest";
import { lintSpecs } from "../src/lint.js";
import type { SpecFile, SpecRule } from "../src/types.js";

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
});
