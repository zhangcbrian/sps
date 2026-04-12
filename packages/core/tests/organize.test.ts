import { describe, it, expect } from "vitest";
import { organize } from "../src/organize.js";
import type { DraftSpec, SpecFile, SpecflowConfig } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const config: SpecflowConfig = {
  ...DEFAULT_CONFIG,
  domains: { checkout: "CHECKOUT", billing: "BIL" },
};

const emptyRule = {
  id: null,
  status: "proposed" as const,
  summary: "Rule",
  description: "",
  given: "",
  when: "",
  then: "",
  examples: [],
  edge_cases: [],
  tests: [],
  added: "2026-04-12",
  modified: null,
};

describe("organize", () => {
  it("generates file path from domain and module", () => {
    const draft: DraftSpec = {
      domain: "checkout",
      module: "coupons",
      description: "Coupon support",
      rules: [{ ...emptyRule, summary: "Apply coupon" }],
    };
    const result = organize(draft, [], config);
    expect(result.filePath).toBe("specs/checkout/coupons.spec.yaml");
    expect(result.isNewFile).toBe(true);
  });

  it("assigns lineage IDs sequentially starting from 01", () => {
    const draft: DraftSpec = {
      domain: "checkout",
      module: "coupons",
      description: "Coupon support",
      rules: [
        { ...emptyRule, summary: "Rule 1" },
        { ...emptyRule, summary: "Rule 2" },
      ],
    };
    const result = organize(draft, [], config);
    expect(result.assignedIds.get(0)).toBe("REQ-CHECKOUT-COUPONS-01");
    expect(result.assignedIds.get(1)).toBe("REQ-CHECKOUT-COUPONS-02");
  });

  it("continues numbering from existing specs", () => {
    const existing: SpecFile[] = [
      {
        domain: "checkout",
        module: "coupons",
        description: "Existing",
        rules: [
          {
            ...emptyRule,
            id: "REQ-CHECKOUT-COUPONS-01",
            status: "active",
            summary: "Existing rule",
          },
          {
            ...emptyRule,
            id: "REQ-CHECKOUT-COUPONS-02",
            status: "active",
            summary: "Another",
          },
        ],
        filePath: "specs/checkout/coupons.spec.yaml",
      },
    ];
    const draft: DraftSpec = {
      domain: "checkout",
      module: "coupons",
      description: "Coupon support",
      rules: [{ ...emptyRule, summary: "New rule" }],
    };
    const result = organize(draft, existing, config);
    expect(result.assignedIds.get(0)).toBe("REQ-CHECKOUT-COUPONS-03");
    expect(result.isNewFile).toBe(false);
  });

  it("uses domain abbreviation from config when available", () => {
    const draft: DraftSpec = {
      domain: "billing",
      module: "invoices",
      description: "Invoices",
      rules: [{ ...emptyRule, summary: "Rule" }],
    };
    const result = organize(draft, [], config);
    expect(result.assignedIds.get(0)).toBe("REQ-BIL-INVOICES-01");
  });
});
