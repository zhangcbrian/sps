import { describe, it, expect, vi } from "vitest";
import { deduplicate } from "../src/deduplicate.js";
import type { DraftSpec, SpecFile } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

vi.mock("ai", () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
      matches: [
        {
          existing_rule_id: "REQ-PAY-CHECKOUT-03",
          draft_rule_index: 0,
          relationship: "extends",
          confidence: 0.85,
          explanation: "Both deal with checkout modifications",
        },
      ],
    },
  }),
}));

const makeRule = (overrides = {}) => ({
  id: null,
  title: "Apply coupon",
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

describe("deduplicate", () => {
  it("returns empty matches when no existing specs", async () => {
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupons",
      category: "business",
      touches: [],
      rules: [makeRule()],
    };
    const result = await deduplicate(draft, [], DEFAULT_CONFIG);
    expect(result.matches).toEqual([]);
  });

  it("finds matches against existing specs via LLM", async () => {
    const existing: SpecFile[] = [
      {
        spec: "payments/checkout",
        title: "Checkout Flow",
        description: "Checkout flow",
        category: "business",
        touches: [],
        rules: [
          makeRule({
            id: "REQ-PAY-CHECKOUT-03",
            status: "active",
            title: "Validate cart before payment",
          }),
        ],
        filePath: "src/payments/checkout.sps.yaml",
      },
    ];
    const draft: DraftSpec = {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupons",
      category: "business",
      touches: [],
      rules: [makeRule({ title: "Apply coupon at checkout" })],
    };
    const result = await deduplicate(draft, existing, DEFAULT_CONFIG);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].relationship).toBe("extends");
    expect(result.matches[0].existingRule.id).toBe("REQ-PAY-CHECKOUT-03");
    expect(result.matches[0].confidence).toBe(0.85);
  });
});
