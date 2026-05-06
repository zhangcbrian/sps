import { describe, it, expect } from "vitest";
import { validateSpec } from "../src/schema.js";
import type { SpecFile, SchemaConfig } from "../src/types.js";

const SCHEMA: SchemaConfig = {
  required_fields: ["spec", "title", "description", "rules"],
  required_rule_fields: ["id", "title", "status", "description", "given", "when", "then"],
  forbidden_rule_fields: ["business_title", "summary"],
  id_format: "REQ-{DOMAIN}-{MODULE}-{NN}",
};

const baseRule = {
  id: "REQ-X-Y-01",
  title: "T",
  status: "active",
  category: "business",
  description: "d",
  given: "g",
  when: "w",
  then: "t",
};

const wrap = (rule: object): SpecFile =>
  ({
    spec: "x/y",
    title: "X",
    description: "x",
    category: "business",
    touches: [],
    rules: [rule],
    filePath: "src/x/y.sps.yaml",
  }) as unknown as SpecFile;

describe("validateSpec — behavior block", () => {
  it("accepts a rule without a behavior block", () => {
    expect(validateSpec(wrap({ ...baseRule }), SCHEMA)).toEqual([]);
  });

  it("accepts a minimal valid behavior block", () => {
    const errors = validateSpec(
      wrap({
        ...baseRule,
        behavior: { surface: "trpc.org.events.list" },
      }),
      SCHEMA
    );
    expect(errors).toEqual([]);
  });

  it("accepts a full behavior block", () => {
    const errors = validateSpec(
      wrap({
        ...baseRule,
        behavior: {
          surface: "trpc.org.events.list",
          inputs: { limit: "number?" },
          outputs: { events: "Event[]" },
          invariants: ["filtered by ctx.orgId"],
          errors: [{ code: "FORBIDDEN", when: "missing permission" }],
        },
      }),
      SCHEMA
    );
    expect(errors).toEqual([]);
  });

  it("requires behavior.surface to be a non-empty string", () => {
    const errors = validateSpec(
      wrap({ ...baseRule, behavior: {} }),
      SCHEMA
    );
    expect(errors.some((e) => e.includes("behavior.surface"))).toBe(true);
  });

  it("requires behavior.errors entries to have code + when strings", () => {
    const errors = validateSpec(
      wrap({
        ...baseRule,
        behavior: {
          surface: "x.y",
          errors: [{ code: "X" }],
        },
      }),
      SCHEMA
    );
    expect(errors.some((e) => e.includes("behavior.errors[0]"))).toBe(true);
  });

  it("rejects non-string entries in behavior.invariants", () => {
    const errors = validateSpec(
      wrap({
        ...baseRule,
        behavior: {
          surface: "x.y",
          invariants: ["valid invariant", 123, "another"],
        },
      }),
      SCHEMA
    );
    expect(
      errors.some((e) => e.includes("behavior.invariants[1]"))
    ).toBe(true);
  });

  it("rejects non-string values in behavior.inputs", () => {
    const errors = validateSpec(
      wrap({
        ...baseRule,
        behavior: {
          surface: "x.y",
          inputs: { limit: 42, name: "string" },
        },
      }),
      SCHEMA
    );
    expect(
      errors.some((e) => e.includes("behavior.inputs.limit"))
    ).toBe(true);
  });

  it("rejects an array in behavior.outputs", () => {
    const errors = validateSpec(
      wrap({
        ...baseRule,
        behavior: { surface: "x.y", outputs: ["bad"] },
      }),
      SCHEMA
    );
    expect(errors.some((e) => e.includes("behavior.outputs"))).toBe(true);
  });

  it("rejects a non-object behavior", () => {
    const errors = validateSpec(
      wrap({ ...baseRule, behavior: "not an object" as unknown }),
      SCHEMA
    );
    expect(errors.some((e) => e.includes("behavior: must be an object"))).toBe(
      true
    );
  });
});

describe("validateSpec — lifecycle statuses", () => {
  it("accepts active, proposed, deprecated, superseded, removed", () => {
    for (const status of ["active", "proposed", "deprecated", "removed"] as const) {
      expect(validateSpec(wrap({ ...baseRule, status }), SCHEMA)).toEqual([]);
    }
  });

  it("requires superseded_by when status is superseded", () => {
    const missing = validateSpec(
      wrap({ ...baseRule, status: "superseded" }),
      SCHEMA
    );
    expect(missing.some((e) => e.includes("superseded_by"))).toBe(true);

    const valid = validateSpec(
      wrap({ ...baseRule, status: "superseded", superseded_by: "REQ-X-Y-02" }),
      SCHEMA
    );
    expect(valid).toEqual([]);
  });

  it("rejects unknown status values", () => {
    const errors = validateSpec(
      wrap({ ...baseRule, status: "made-up" }),
      SCHEMA
    );
    expect(errors.some((e) => e.includes("status"))).toBe(true);
  });
});
