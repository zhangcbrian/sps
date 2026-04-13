import { describe, it, expect } from "vitest";
import { organize } from "../src/organize.js";
import type { DraftSpec, SpecFile, SpsConfig } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const config: SpsConfig = {
  ...DEFAULT_CONFIG,
  domains: { checkout: "CHECKOUT", billing: "BIL" },
};

const makeRule = (overrides = {}) => ({
  id: null,
  title: "Rule",
  status: "proposed" as const,
  category: "business",
  description: "",
  given: "",
  when: "",
  then: "",
  examples: [],
  edge_cases: [],
  tests: [],
  ...overrides,
});

describe("organize", () => {
  it("generates co-located file path from spec identity", () => {
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: [],
      rules: [makeRule({ title: "Apply coupon" })],
    };
    const result = organize(draft, [], config);
    expect(result.filePath).toBe("src/checkout/coupons/coupons.sps.yaml");
    expect(result.isNewFile).toBe(true);
    expect(result.spec).toBe("checkout/coupons");
  });

  it("generates path for single-level spec", () => {
    const draft: DraftSpec = {
      spec: "billing",
      title: "Billing",
      description: "Billing",
      category: "business",
      touches: [],
      rules: [makeRule()],
    };
    const result = organize(draft, [], config);
    expect(result.filePath).toBe("src/billing/billing.sps.yaml");
  });

  it("assigns lineage IDs sequentially starting from 01", () => {
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: [],
      rules: [
        makeRule({ title: "Rule 1" }),
        makeRule({ title: "Rule 2" }),
      ],
    };
    const result = organize(draft, [], config);
    expect(result.assignedIds.get(0)).toBe("REQ-CHECKOUT-COUPONS-01");
    expect(result.assignedIds.get(1)).toBe("REQ-CHECKOUT-COUPONS-02");
  });

  it("continues numbering from existing specs", () => {
    const existing: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Existing",
        category: "business",
        touches: [],
        rules: [
          makeRule({ id: "REQ-CHECKOUT-COUPONS-01", status: "active", title: "Existing rule" }),
          makeRule({ id: "REQ-CHECKOUT-COUPONS-02", status: "active", title: "Another" }),
        ],
        filePath: "src/checkout/coupons/coupons.sps.yaml",
      },
    ];
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: [],
      rules: [makeRule({ title: "New rule" })],
    };
    const result = organize(draft, existing, config);
    expect(result.assignedIds.get(0)).toBe("REQ-CHECKOUT-COUPONS-03");
    expect(result.isNewFile).toBe(false);
  });

  it("uses domain abbreviation from config when available", () => {
    const draft: DraftSpec = {
      spec: "billing/invoices",
      title: "Invoices",
      description: "Invoices",
      category: "business",
      touches: [],
      rules: [makeRule()],
    };
    const result = organize(draft, [], config);
    expect(result.assignedIds.get(0)).toBe("REQ-BIL-INVOICES-01");
  });
});
