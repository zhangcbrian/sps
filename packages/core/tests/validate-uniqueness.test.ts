import { describe, it, expect } from "vitest";
import { validateUniqueness } from "../src/validate-uniqueness.js";
import type { SpecFile, SpecRule } from "../src/types.js";

const makeRule = (id: string | null, title = "rule"): SpecRule => ({
  id,
  title,
  status: "active",
  category: "business",
  description: "",
  given: "",
  when: "",
  then: "",
  examples: [],
  edge_cases: [],
  tests: [],
});

const makeSpec = (filePath: string, rules: SpecRule[]): SpecFile => ({
  spec: filePath.replace(/\.sps\.yaml$/, "").replace(/\//g, "-"),
  title: "Test",
  description: "",
  category: "business",
  touches: [],
  rules,
  filePath,
});

describe("validateUniqueness", () => {
  it("returns no errors when all IDs are unique", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01"),
        makeRule("REQ-A-X-02"),
      ]),
      makeSpec("src/b/b.sps.yaml", [makeRule("REQ-B-Y-01")]),
    ];
    expect(validateUniqueness(specs)).toEqual([]);
  });

  it("flags duplicate IDs across files", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [makeRule("REQ-X-Y-01", "first")]),
      makeSpec("src/b/b.sps.yaml", [makeRule("REQ-X-Y-01", "second")]),
    ];
    const errors = validateUniqueness(specs);
    expect(errors).toHaveLength(1);
    expect(errors[0].id).toBe("REQ-X-Y-01");
    expect(errors[0].occurrences).toHaveLength(2);
    expect(errors[0].occurrences[0].specFile).toBe("src/a/a.sps.yaml");
    expect(errors[0].occurrences[0].ruleTitle).toBe("first");
    expect(errors[0].occurrences[1].specFile).toBe("src/b/b.sps.yaml");
  });

  it("flags duplicate IDs within the same file", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01", "first"),
        makeRule("REQ-A-X-01", "second"),
      ]),
    ];
    const errors = validateUniqueness(specs);
    expect(errors).toHaveLength(1);
    expect(errors[0].occurrences).toHaveLength(2);
  });

  it("ignores null IDs (pre-assignment)", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [makeRule(null), makeRule(null)]),
    ];
    expect(validateUniqueness(specs)).toEqual([]);
  });

  it("returns multiple distinct duplicate sets", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01"),
        makeRule("REQ-B-Y-01"),
      ]),
      makeSpec("src/b/b.sps.yaml", [
        makeRule("REQ-A-X-01"),
        makeRule("REQ-B-Y-01"),
      ]),
    ];
    const errors = validateUniqueness(specs);
    expect(errors.map((e) => e.id).sort()).toEqual([
      "REQ-A-X-01",
      "REQ-B-Y-01",
    ]);
  });
});
