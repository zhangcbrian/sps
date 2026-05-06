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

  it("flags an unresolved superseded_by link", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01", { status: "superseded" }),
      ]),
    ];
    specs[0].rules[0].superseded_by = "REQ-GHOST-99";
    const errors = validateCrossRefs(specs);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("superseded_by");
    expect(errors[0].unresolvedRef).toBe("REQ-GHOST-99");
  });

  it("flags a superseded_by link that points to itself", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01", { status: "superseded" }),
      ]),
    ];
    specs[0].rules[0].superseded_by = "REQ-A-X-01";
    const errors = validateCrossRefs(specs);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("superseded_by");
    expect(errors[0].unresolvedRef).toBe("REQ-A-X-01");
  });

  it("does not flag a superseded_by link that resolves", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01", { status: "superseded" }),
        makeRule("REQ-A-X-02"),
      ]),
    ];
    specs[0].rules[0].superseded_by = "REQ-A-X-02";
    const errors = validateCrossRefs(specs);
    expect(errors.filter((e) => e.field === "superseded_by")).toEqual([]);
  });

  it("scans behavior block invariants and errors[].when for citations", () => {
    const specs = [
      makeSpec("src/a/a.sps.yaml", [
        makeRule("REQ-A-X-01", {
          description: "no refs here",
        }),
      ]),
    ];
    specs[0].rules[0].behavior = {
      surface: "trpc.x.y",
      invariants: ["builds on REQ-GHOST-77"],
      errors: [{ code: "X", when: "as described in REQ-GHOST-78" }],
    };
    const errors = validateCrossRefs(specs);
    const refs = errors.map((e) => e.unresolvedRef).sort();
    expect(refs).toContain("REQ-GHOST-77");
    expect(refs).toContain("REQ-GHOST-78");
    expect(errors.every((e) => e.field === "behavior")).toBe(true);
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
