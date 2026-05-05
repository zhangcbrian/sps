import { describe, it, expect } from "vitest";
import { validateCrossRefs } from "../src/validate-cross-refs.js";
import type { SpecFile, SpecRule } from "../src/types.js";

const makeRule = (
  id: string | null,
  fields: Partial<SpecRule> = {}
): SpecRule => ({
  id,
  title: fields.title ?? "rule",
  status: fields.status ?? "active",
  category: fields.category ?? "business",
  description: fields.description ?? "",
  given: fields.given ?? "",
  when: fields.when ?? "",
  then: fields.then ?? "",
  examples: fields.examples ?? [],
  edge_cases: fields.edge_cases ?? [],
  tests: fields.tests ?? [],
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

describe("validateCrossRefs", () => {
  it("returns no errors when all citations resolve", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01", { description: "See REQ-B-Y-01 for context." }),
      ]),
      makeSpec("src/b/b.sps.yaml", [makeRule("REQ-B-Y-01")]),
    ];
    expect(validateCrossRefs(specs)).toEqual([]);
  });

  it("flags citations that do not resolve", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01", {
          description: "Builds on REQ-GHOST-01.",
        }),
      ]),
    ];
    const errors = validateCrossRefs(specs);
    expect(errors).toHaveLength(1);
    expect(errors[0].unresolvedRef).toBe("REQ-GHOST-01");
    expect(errors[0].field).toBe("description");
    expect(errors[0].ruleId).toBe("REQ-A-X-01");
  });

  it("dedupes citations within the same field", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01", {
          description: "See REQ-GHOST-01. Also REQ-GHOST-01 again.",
        }),
      ]),
    ];
    const errors = validateCrossRefs(specs);
    expect(errors).toHaveLength(1);
  });

  it("scans given/when/then/edge_cases", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01", {
          given: "User has REQ-G-01 enabled",
          when: "REQ-W-01 fires",
          then: "REQ-T-01 happens",
          edge_cases: [
            { case: "see REQ-EC-01", decision: "ignore REQ-EC-02" },
          ],
        }),
      ]),
    ];
    const errors = validateCrossRefs(specs);
    const fields = errors.map((e) => e.field).sort();
    expect(fields).toEqual([
      "edge_case",
      "edge_case",
      "given",
      "then",
      "when",
    ]);
  });

  it("ignores self-references", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01", {
          description: "As REQ-A-X-01 states above...",
        }),
      ]),
    ];
    expect(validateCrossRefs(specs)).toEqual([]);
  });

  it("does not match REQ- without trailing digits", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01", {
          description: "REQUIREMENT-FOO-BAR is not a citation.",
        }),
      ]),
    ];
    expect(validateCrossRefs(specs)).toEqual([]);
  });
});
