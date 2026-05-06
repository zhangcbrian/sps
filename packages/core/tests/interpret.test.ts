import { describe, it, expect, vi } from "vitest";
import { interpret } from "../src/interpret.js";
import type { SpecFile } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

vi.mock("ai", () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
      spec: "checkout/coupons",
      title: "Discount Codes",
      description: "Coupon discount support for checkout",
      category: "business",
      touches: ["billing"],
      rules: [
        {
          id: null,
          title: "Percentage coupon reduces cart total",
          status: "proposed",
          category: "business",
          description: "Applies a percentage discount to the cart subtotal",
          given: "A customer has a $100 cart and enters SAVE20",
          when: "The coupon is applied at checkout",
          then: "The cart total becomes $80",
          behavior: {
            surface: "checkout.applyCoupon",
            inputs: { code: "string", cartCents: "number" },
            outputs: { discountCents: "number", totalCents: "number" },
            invariants: ["totalCents = max(0, cartCents - discountCents)"],
            errors: [{ code: "INVALID_COUPON", when: "code not recognized" }],
          },
          examples: [
            {
              input: { cart_cents: 10000 },
              output: { total_cents: 8000 },
            },
          ],
          edge_cases: [],
          tests: [],
        },
      ],
    },
  }),
}));

describe("interpret", () => {
  it("returns a draft spec with SPS schema from natural language", async () => {
    const result = await interpret(
      "We need discount codes at checkout",
      [],
      DEFAULT_CONFIG
    );
    expect(result.spec).toBe("checkout/coupons");
    expect(result.title).toBe("Discount Codes");
    expect(result.category).toBe("business");
    expect(result.touches).toEqual(["billing"]);
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].title).toBe("Percentage coupon reduces cart total");
    expect(result.rules[0].given).toContain("$100");
    expect(result.rules[0].behavior?.surface).toBe("checkout.applyCoupon");
  });

  it("passes existing specs as context without crashing", async () => {
    const existing: SpecFile[] = [
      {
        spec: "checkout/validation",
        title: "Checkout Validation",
        description: "Checkout validation",
        category: "engineering",
        touches: [],
        rules: [
          {
            id: "REQ-CHECKOUT-VAL-01",
            title: "Cart must have items",
            status: "active",
            category: "engineering",
            description: "Cannot checkout with empty cart",
            given: "An empty cart",
            when: "User clicks checkout",
            then: "Error shown",
            examples: [],
            edge_cases: [],
            tests: [],
          },
        ],
        filePath: "src/checkout/checkout.sps.yaml",
      },
    ];

    const result = await interpret(
      "We need discount codes",
      existing,
      DEFAULT_CONFIG
    );
    expect(result.spec).toBeDefined();
  });
});
