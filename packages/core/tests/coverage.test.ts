import { describe, it, expect } from "vitest";
import { analyzeCoverage } from "../src/coverage.js";
import type { SpecFile } from "../src/types.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const makeRule = (id: string, title: string) => ({
  id,
  title,
  status: "active" as const,
  category: "business",
  description: "",
  given: "",
  when: "",
  then: "",
  examples: [],
  edge_cases: [],
  tests: [],
});

describe("analyzeCoverage", () => {
  it("reports all rules as uncovered when no test files exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Coupons",
        category: "business",
        touches: [],
        rules: [makeRule("REQ-CHECKOUT-COUPON-01", "Apply coupon")],
        filePath: "src/checkout/coupons.sps.yaml",
      },
    ];

    const result = analyzeCoverage(specs, dir);
    expect(result.totalRules).toBe(1);
    expect(result.coveredRules).toBe(0);
    expect(result.uncovered).toHaveLength(1);
    expect(result.uncovered[0].ruleId).toBe("REQ-CHECKOUT-COUPON-01");
  });

  it("detects coverage from test files containing lineage IDs", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "src/checkout"), { recursive: true });
    writeFileSync(
      join(dir, "src/checkout/coupons.test.ts"),
      `describe("[REQ-CHECKOUT-COUPON-01] Apply coupon", () => {\n  it("applies discount", () => {});\n});\n`
    );

    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Coupons",
        category: "business",
        touches: [],
        rules: [
          makeRule("REQ-CHECKOUT-COUPON-01", "Apply coupon"),
          makeRule("REQ-CHECKOUT-COUPON-02", "Remove coupon"),
        ],
        filePath: "src/checkout/coupons.sps.yaml",
      },
    ];

    const result = analyzeCoverage(specs, dir);
    expect(result.totalRules).toBe(2);
    expect(result.coveredRules).toBe(1);
    expect(result.covered).toHaveLength(1);
    expect(result.covered[0].ruleId).toBe("REQ-CHECKOUT-COUPON-01");
    expect(result.uncovered).toHaveLength(1);
    expect(result.uncovered[0].ruleId).toBe("REQ-CHECKOUT-COUPON-02");
  });

  it("skips rules with null IDs", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    const specs: SpecFile[] = [
      {
        spec: "test/mod",
        title: "Test",
        description: "Test",
        category: "business",
        touches: [],
        rules: [{ ...makeRule("REQ-TEST-01", "Rule 1"), id: null }],
        filePath: "src/test.sps.yaml",
      },
    ];

    const result = analyzeCoverage(specs, dir);
    expect(result.totalRules).toBe(0);
  });

  it("ignores stray REQ-* mentions in comments or prose", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "tests"), { recursive: true });
    writeFileSync(
      join(dir, "tests/coupons.test.ts"),
      `// TODO: see REQ-CHECKOUT-COUPON-01 someday\n// REQ-CHECKOUT-COUPON-02 was deleted\nconsole.log("REQ-CHECKOUT-COUPON-03");\n`
    );

    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Coupons",
        description: "",
        category: "business",
        touches: [],
        rules: [
          makeRule("REQ-CHECKOUT-COUPON-01", "Apply"),
          makeRule("REQ-CHECKOUT-COUPON-02", "Remove"),
          makeRule("REQ-CHECKOUT-COUPON-03", "List"),
        ],
        filePath: "src/checkout/coupons.sps.yaml",
      },
    ];

    const result = analyzeCoverage(specs, dir);
    expect(result.coveredRules).toBe(0);
    expect(result.uncovered).toHaveLength(3);
  });

  it("matches REQ-* inside it() and test() calls too", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "tests"), { recursive: true });
    writeFileSync(
      join(dir, "tests/coupons.test.ts"),
      `it("[REQ-COVER-IT-01] applies", () => {});\ntest("[REQ-COVER-TEST-01] removes", () => {});\n`
    );

    const specs: SpecFile[] = [
      {
        spec: "x/y",
        title: "Y",
        description: "",
        category: "business",
        touches: [],
        rules: [
          makeRule("REQ-COVER-IT-01", "Apply"),
          makeRule("REQ-COVER-TEST-01", "Remove"),
        ],
        filePath: "src/y.sps.yaml",
      },
    ];

    const result = analyzeCoverage(specs, dir);
    expect(result.coveredRules).toBe(2);
  });

  it("calculates coverage percentage", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "tests"), { recursive: true });
    writeFileSync(
      join(dir, "tests/checkout.test.ts"),
      `describe("[REQ-CHECKOUT-FLOW-01] Checkout", () => {});\ndescribe("[REQ-CHECKOUT-FLOW-02] Cart", () => {});\n`
    );

    const specs: SpecFile[] = [
      {
        spec: "checkout",
        title: "Checkout",
        description: "Checkout",
        category: "business",
        touches: [],
        rules: [
          makeRule("REQ-CHECKOUT-FLOW-01", "Checkout"),
          makeRule("REQ-CHECKOUT-FLOW-02", "Cart"),
          makeRule("REQ-CHECKOUT-FLOW-03", "Payment"),
          makeRule("REQ-CHECKOUT-FLOW-04", "Confirmation"),
        ],
        filePath: "src/checkout.sps.yaml",
      },
    ];

    const result = analyzeCoverage(specs, dir);
    expect(result.totalRules).toBe(4);
    expect(result.coveredRules).toBe(2);
    expect(result.coveragePercent).toBe(50);
  });
});
