import { describe, it, expect } from "vitest";
import type {
  SpsConfig,
  SpecFile,
  SpecRule,
  DraftSpec,
  OrganizeResult,
  ManifestEntry,
  Manifest,
} from "../src/types.js";

describe("SPS types", () => {
  it("SpecFile uses spec identity instead of domain/module", () => {
    const file: SpecFile = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: ["billing"],
      rules: [],
      filePath: "src/checkout/coupons/coupons.sps.yaml",
    };
    expect(file.spec).toBe("checkout/coupons");
    expect(file.touches).toEqual(["billing"]);
    expect(file.category).toBe("business");
  });

  it("SpecRule uses unified title instead of business_title/summary", () => {
    const rule: SpecRule = {
      id: "REQ-CHECKOUT-COUPON-01",
      title: "Customers can use a percentage discount code",
      status: "active",
      category: "business",
      description: "Applies a percentage discount",
      given: "A cart with $100",
      when: "Coupon applied",
      then: "Total becomes $80",
      examples: [],
      edge_cases: [],
      tests: [],
    };
    expect(rule.title).toBe("Customers can use a percentage discount code");
    expect(rule.id).toBe("REQ-CHECKOUT-COUPON-01");
  });

  it("DraftSpec uses spec identity", () => {
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon support",
      category: "business",
      touches: [],
      rules: [],
    };
    expect(draft.spec).toBe("checkout/coupons");
  });

  it("SpsConfig has no specs_dir", () => {
    const config: SpsConfig = {
      version: 1,
      schema: {
        required_fields: ["spec", "title", "description", "rules"],
        required_rule_fields: ["id", "status", "title", "description", "given", "when", "then"],
        forbidden_rule_fields: ["rule", "summary", "business_title"],
        id_format: "REQ-{DOMAIN}-{MODULE}-{NN}",
      },
      domains: {},
      categories: [],
      llm: { provider: "anthropic", model: "claude-sonnet-4-6" },
      git: { branch_prefix: "spec/", commit_prefix: "feat(spec):", create_pr: true, pr_platform: "github" },
      dedup: { enabled: true, similarity_threshold: 0.7 },
    };
    expect(config.version).toBe(1);
    expect("specs_dir" in config).toBe(false);
  });

  it("ManifestEntry captures spec summary for the manifest", () => {
    const entry: ManifestEntry = {
      path: "src/checkout/coupons.sps.yaml",
      spec: "checkout/coupons",
      title: "Discount Codes",
      categories: ["business"],
      rule_count: 3,
      touches: ["billing"],
      status_summary: { active: 3 },
    };
    expect(entry.path).toBe("src/checkout/coupons.sps.yaml");
  });

  it("Manifest has totals and cross_references", () => {
    const manifest: Manifest = {
      generated_at: "2026-04-12T16:00:00Z",
      specs: [],
      totals: { files: 0, rules: 0, by_category: {}, by_status: {} },
      cross_references: {},
      drift: [],
    };
    expect(manifest.generated_at).toBeDefined();
    expect(manifest.totals.files).toBe(0);
  });
});
