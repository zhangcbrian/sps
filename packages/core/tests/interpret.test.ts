import { describe, it, expect, vi } from "vitest";
import { interpret } from "../src/interpret.js";
import type { SpecFile } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              domain: "checkout",
              module: "coupons",
              description: "Coupon discount support for checkout",
              rules: [
                {
                  id: null,
                  status: "proposed",
                  summary: "Percentage coupon reduces cart total",
                  description:
                    "Applies a percentage discount to the cart subtotal",
                  given: "A customer has a $100 cart and enters SAVE20",
                  when: "The coupon is applied at checkout",
                  then: "The cart total becomes $80",
                  examples: [
                    {
                      input: { cart_cents: 10000 },
                      output: { total_cents: 8000 },
                    },
                  ],
                  edge_cases: [],
                  tests: [],
                  added: "2026-04-12",
                  modified: null,
                },
              ],
            }),
          },
        ],
      }),
    };
  },
}));

describe("interpret", () => {
  it("returns a draft spec from natural language input", async () => {
    const result = await interpret(
      "We need discount codes at checkout",
      [],
      DEFAULT_CONFIG
    );
    expect(result.domain).toBe("checkout");
    expect(result.module).toBe("coupons");
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].summary).toBe(
      "Percentage coupon reduces cart total"
    );
    expect(result.rules[0].given).toContain("$100");
  });

  it("passes existing specs as context without crashing", async () => {
    const existing: SpecFile[] = [
      {
        domain: "checkout",
        module: "validation",
        description: "Checkout validation",
        rules: [
          {
            id: "REQ-CHECKOUT-VAL-01",
            status: "active",
            summary: "Cart must have items",
            description: "Cannot checkout with empty cart",
            given: "An empty cart",
            when: "User clicks checkout",
            then: "Error shown",
            examples: [],
            edge_cases: [],
            tests: [],
            added: "2026-04-12",
            modified: null,
          },
        ],
        filePath: "specs/checkout/validation.spec.yaml",
      },
    ];

    const result = await interpret(
      "We need discount codes",
      existing,
      DEFAULT_CONFIG
    );
    expect(result.domain).toBeDefined();
  });
});
