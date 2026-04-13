import { describe, it, expect } from "vitest";
import { validateSpec } from "../src/schema.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const validRule = {
  id: "REQ-CHECKOUT-COUPON-01",
  title: "Customers can use a percentage discount code",
  status: "active" as const,
  category: "business",
  description: "Applies a percentage discount",
  given: "A customer has a $100 cart",
  when: "Coupon applied",
  then: "Cart becomes $80",
  examples: [],
  edge_cases: [],
  tests: [],
};

describe("validateSpec", () => {
  it("returns no errors for a valid spec", () => {
    const spec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: [],
      rules: [validRule],
      filePath: "src/checkout/coupons.sps.yaml",
    };
    const errors = validateSpec(spec, DEFAULT_CONFIG.schema);
    expect(errors).toEqual([]);
  });

  it("reports missing top-level fields", () => {
    const spec = { rules: [validRule], filePath: "test.yaml" } as any;
    const errors = validateSpec(spec, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('"spec"'))).toBe(true);
    expect(errors.some((e: string) => e.includes('"title"'))).toBe(true);
  });

  it("reports missing rule fields", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ id: "REQ-TEST-01", status: "active", title: "No given/when/then" }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('"given"'))).toBe(true);
    expect(errors.some((e: string) => e.includes('"when"'))).toBe(true);
    expect(errors.some((e: string) => e.includes('"then"'))).toBe(true);
  });

  it("reports forbidden rule fields — summary", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ ...validRule, summary: "Old field" }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('forbidden field "summary"'))).toBe(true);
  });

  it("reports forbidden rule fields — business_title", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ ...validRule, business_title: "Old field" }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('forbidden field "business_title"'))).toBe(true);
  });

  it("reports invalid status", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ ...validRule, status: "invalid" }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('"status"'))).toBe(true);
  });

  it("reports invalid category when categories are provided", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ ...validRule, category: "nonexistent" }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec, DEFAULT_CONFIG.schema, DEFAULT_CONFIG.categories);
    expect(errors.some((e: string) => e.includes('"category" must be one of'))).toBe(true);
  });

  it("validates given/when/then are strings not arrays", () => {
    const spec = {
      spec: "test/mod",
      title: "Test",
      description: "Test",
      category: "business",
      touches: [],
      rules: [{ ...validRule, given: ["step1", "step2"] }],
      filePath: "test.yaml",
    };
    const errors = validateSpec(spec as any, DEFAULT_CONFIG.schema);
    expect(errors.some((e: string) => e.includes('"given" must be a string'))).toBe(true);
  });
});
