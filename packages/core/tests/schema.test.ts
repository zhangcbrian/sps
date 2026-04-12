import { describe, it, expect } from "vitest";
import { validateSpec } from "../src/schema.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const validRule = {
  id: "REQ-TEST-MOD-01",
  status: "active" as const,
  summary: "Test rule",
  description: "A test rule",
  given: "A user exists",
  when: "They do something",
  then: "Something happens",
  examples: [],
  edge_cases: [],
  tests: [],
  added: "2026-04-12",
  modified: null,
};

describe("validateSpec", () => {
  it("returns no errors for a valid spec", () => {
    const spec = {
      domain: "test",
      module: "mod",
      description: "Test module",
      rules: [validRule],
      filePath: "specs/test/mod.spec.yaml",
    };
    const errors = validateSpec(spec, DEFAULT_CONFIG.schema);
    expect(errors).toEqual([]);
  });

  it("reports missing top-level fields", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spec = { rules: [validRule], filePath: "test.yaml" } as any;
    const errors = validateSpec(spec, DEFAULT_CONFIG.schema);
    expect(errors.some((e) => e.includes('"domain"'))).toBe(true);
    expect(errors.some((e) => e.includes('"module"'))).toBe(true);
  });

  it("reports missing rule fields", () => {
    const spec = {
      domain: "test",
      module: "mod",
      description: "Test",
      rules: [
        { id: "REQ-TEST-01", status: "active", summary: "No given/when/then" },
      ],
      filePath: "test.yaml",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e) => e.includes('"given"'))).toBe(true);
    expect(errors.some((e) => e.includes('"when"'))).toBe(true);
    expect(errors.some((e) => e.includes('"then"'))).toBe(true);
  });

  it("reports forbidden rule fields", () => {
    const spec = {
      domain: "test",
      module: "mod",
      description: "Test",
      rules: [{ ...validRule, rule: "Should be summary" }],
      filePath: "test.yaml",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e) => e.includes('forbidden field "rule"'))).toBe(
      true
    );
  });

  it("reports added as object instead of string", () => {
    const spec = {
      domain: "test",
      module: "mod",
      description: "Test",
      rules: [
        {
          ...validRule,
          added: { ticket: "#1", date: "2026-04-12" },
        },
      ],
      filePath: "test.yaml",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(
      errors.some((e) => e.includes('"added" must be a date string'))
    ).toBe(true);
  });
});
