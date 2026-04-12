import { describe, it, expect, vi } from "vitest";
import { deduplicate } from "../src/deduplicate.js";
import type { DraftSpec, SpecFile } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              matches: [
                {
                  existing_rule_id: "REQ-PAY-CHECKOUT-03",
                  draft_rule_index: 0,
                  relationship: "extends",
                  confidence: 0.85,
                  explanation: "Both deal with checkout modifications",
                },
              ],
            }),
          },
        ],
      }),
    };
  },
}));

const emptyRule = {
  id: null,
  status: "proposed" as const,
  summary: "Apply coupon",
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

describe("deduplicate", () => {
  it("returns empty matches when no existing specs", async () => {
    const draft: DraftSpec = {
      domain: "checkout",
      module: "coupons",
      description: "Coupons",
      rules: [emptyRule],
    };
    const result = await deduplicate(draft, [], DEFAULT_CONFIG);
    expect(result.matches).toEqual([]);
  });

  it("finds matches against existing specs via LLM", async () => {
    const existing: SpecFile[] = [
      {
        domain: "payments",
        module: "checkout",
        description: "Checkout flow",
        rules: [
          {
            ...emptyRule,
            id: "REQ-PAY-CHECKOUT-03",
            status: "active",
            summary: "Validate cart before payment",
          },
        ],
        filePath: "specs/payments/checkout.spec.yaml",
      },
    ];
    const draft: DraftSpec = {
      domain: "checkout",
      module: "coupons",
      description: "Coupons",
      rules: [
        { ...emptyRule, summary: "Apply coupon at checkout" },
      ],
    };
    const result = await deduplicate(draft, existing, DEFAULT_CONFIG);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].relationship).toBe("extends");
    expect(result.matches[0].existingRule.id).toBe("REQ-PAY-CHECKOUT-03");
    expect(result.matches[0].confidence).toBe(0.85);
  });
});
