import { describe, it, expect } from "vitest";
import { buildManifest } from "../src/scan.js";
import type { SpecFile, SpsConfig } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const config: SpsConfig = {
  ...DEFAULT_CONFIG,
  domains: { checkout: "CHECKOUT", billing: "BIL" },
};

const makeRule = (id: string, status: string, category: string) => ({
  id,
  title: "Test rule",
  status: status as "active" | "proposed" | "deprecated",
  category,
  description: "A rule",
  given: "Given",
  when: "When",
  then: "Then",
  examples: [],
  edge_cases: [],
  tests: [],
});

describe("buildManifest", () => {
  it("builds manifest from spec files", () => {
    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Coupons",
        category: "business",
        touches: ["billing"],
        rules: [
          makeRule("REQ-CHECKOUT-COUPON-01", "active", "business"),
          makeRule("REQ-CHECKOUT-COUPON-02", "proposed", "business"),
        ],
        filePath: "src/checkout/coupons/coupons.sps.yaml",
      },
    ];

    const manifest = buildManifest(specs, config);

    expect(manifest.specs).toHaveLength(1);
    expect(manifest.specs[0].spec).toBe("checkout/coupons");
    expect(manifest.specs[0].rule_count).toBe(2);
    expect(manifest.specs[0].status_summary).toEqual({ active: 1, proposed: 1 });
    expect(manifest.specs[0].categories).toEqual(["business"]);
    expect(manifest.specs[0].touches).toEqual(["billing"]);
    expect(manifest.totals.files).toBe(1);
    expect(manifest.totals.rules).toBe(2);
    expect(manifest.totals.by_category).toEqual({ business: 2 });
    expect(manifest.totals.by_status).toEqual({ active: 1, proposed: 1 });
    expect(manifest.generated_at).toBeDefined();
  });

  it("builds cross-reference reverse index from touches", () => {
    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Coupons",
        category: "business",
        touches: ["billing", "notifications"],
        rules: [
          makeRule("REQ-CHECKOUT-COUPON-01", "active", "business"),
        ],
        filePath: "src/checkout/coupons/coupons.sps.yaml",
      },
    ];

    const manifest = buildManifest(specs, config);

    expect(manifest.cross_references.billing).toBeDefined();
    expect(manifest.cross_references.billing.touched_by).toHaveLength(1);
    expect(manifest.cross_references.billing.touched_by[0].spec).toBe("checkout/coupons");
    expect(manifest.cross_references.notifications).toBeDefined();
  });

  it("detects drift between file path and declared spec", () => {
    const specs: SpecFile[] = [
      {
        spec: "billing",
        title: "Billing",
        description: "Billing",
        category: "business",
        touches: [],
        rules: [],
        filePath: "src/payments/billing.sps.yaml",
      },
    ];

    const manifest = buildManifest(specs, config);

    expect(manifest.drift).toHaveLength(1);
    expect(manifest.drift[0].path).toBe("src/payments/billing.sps.yaml");
    expect(manifest.drift[0].issue).toContain("billing");
  });

  it("returns empty manifest for no specs", () => {
    const manifest = buildManifest([], config);
    expect(manifest.specs).toEqual([]);
    expect(manifest.totals.files).toBe(0);
    expect(manifest.totals.rules).toBe(0);
  });
});
