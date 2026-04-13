import { describe, it, expect } from "vitest";
import { loadSpecs } from "../src/loader.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadSpecs", () => {
  it("returns empty array when no .sps.yaml files exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    const specs = loadSpecs(dir);
    expect(specs).toEqual([]);
  });

  it("discovers .sps.yaml files from nested directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "src/checkout/coupons"), { recursive: true });
    writeFileSync(
      join(dir, "src/checkout/coupons/coupons.sps.yaml"),
      `spec: checkout/coupons\ntitle: Discount Codes\ndescription: Coupon support\ncategory: business\ntouches: []\nrules:\n  - id: REQ-CHECKOUT-COUPON-01\n    title: "Apply coupon"\n    status: active\n    category: business\n    description: "Applies coupon"\n    given: "A cart"\n    when: "Coupon applied"\n    then: "Discount shown"\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );
    const specs = loadSpecs(dir);
    expect(specs).toHaveLength(1);
    expect(specs[0].spec).toBe("checkout/coupons");
    expect(specs[0].title).toBe("Discount Codes");
    expect(specs[0].rules[0].id).toBe("REQ-CHECKOUT-COUPON-01");
    expect(specs[0].filePath).toBe("src/checkout/coupons/coupons.sps.yaml");
  });

  it("skips node_modules and .git directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "node_modules/pkg"), { recursive: true });
    writeFileSync(
      join(dir, "node_modules/pkg/something.sps.yaml"),
      `spec: pkg/something\ntitle: Should be skipped\ndescription: X\ncategory: business\ntouches: []\nrules: []\n`
    );
    const specs = loadSpecs(dir);
    expect(specs).toEqual([]);
  });

  it("discovers multiple .sps.yaml files across directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "src/checkout"), { recursive: true });
    mkdirSync(join(dir, "src/billing"), { recursive: true });
    writeFileSync(
      join(dir, "src/checkout/checkout.sps.yaml"),
      `spec: checkout\ntitle: Checkout\ndescription: Checkout flow\ncategory: business\ntouches: []\nrules:\n  - id: REQ-CHECKOUT-01\n    title: "Cart checkout"\n    status: active\n    category: business\n    description: "Check out"\n    given: "A cart"\n    when: "Checkout"\n    then: "Order placed"\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );
    writeFileSync(
      join(dir, "src/billing/billing.sps.yaml"),
      `spec: billing\ntitle: Billing\ndescription: Billing\ncategory: business\ntouches: []\nrules:\n  - id: REQ-BIL-01\n    title: "Create invoice"\n    status: active\n    category: business\n    description: "Invoice"\n    given: "A user"\n    when: "Request"\n    then: "Invoice created"\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );
    const specs = loadSpecs(dir);
    expect(specs).toHaveLength(2);
  });
});
