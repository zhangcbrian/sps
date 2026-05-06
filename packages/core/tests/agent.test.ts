import { describe, it, expect } from "vitest";
import { generateAgentInstructions } from "../src/agent.js";
import type { SpecFile } from "../src/types.js";
import type { Principle } from "../src/principles.js";

const makeRule = (overrides = {}) => ({
  id: "REQ-CHECKOUT-COUPON-01",
  title: "Customers can use a percentage discount code",
  status: "active" as const,
  category: "business",
  description: "Applies a percentage discount to the cart subtotal.",
  given: "A customer has a $100 cart and enters SAVE20",
  when: "The coupon is applied at checkout",
  then: "The cart total becomes $80",
  examples: [],
  edge_cases: [],
  tests: [],
  ...overrides,
});

describe("generateAgentInstructions", () => {
  it("generates markdown with active rules", () => {
    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Coupon support",
        category: "business",
        touches: ["billing"],
        rules: [makeRule()],
        filePath: "src/checkout/coupons/coupons.sps.yaml",
      },
    ];

    const output = generateAgentInstructions(specs, []);
    expect(output).toContain("# SPS Spec Rules");
    expect(output).toContain("checkout/coupons");
    expect(output).toContain("REQ-CHECKOUT-COUPON-01");
    expect(output).toContain("Customers can use a percentage discount code");
    expect(output).toContain("Given:");
    expect(output).toContain("When:");
    expect(output).toContain("Then:");
    expect(output).toContain("touches: billing");
  });

  it("includes principles when provided", () => {
    const principles: Principle[] = [
      { id: "money-in-cents", title: "Money in cents", description: "All monetary values are integers in cents." },
    ];

    const output = generateAgentInstructions([], principles);
    expect(output).toContain("## Principles");
    expect(output).toContain("Money in cents");
    expect(output).toContain("integers in cents");
  });

  it("skips deprecated rules", () => {
    const specs: SpecFile[] = [
      {
        spec: "checkout/old",
        title: "Old",
        description: "Old spec",
        category: "business",
        touches: [],
        rules: [makeRule({ id: "REQ-OLD-01", status: "deprecated", title: "Old rule" })],
        filePath: "src/checkout/old.sps.yaml",
      },
    ];

    const output = generateAgentInstructions(specs, []);
    expect(output).not.toContain("REQ-OLD-01");
  });

  it("returns minimal output for empty specs", () => {
    const output = generateAgentInstructions([], []);
    expect(output).toContain("# SPS Spec Rules");
    expect(output).toContain("No active spec rules found");
  });

  it("renders the behavior block when present", () => {
    const specs: SpecFile[] = [
      {
        spec: "checkout/coupons",
        title: "Discount Codes",
        description: "Coupon support",
        category: "business",
        touches: [],
        rules: [
          makeRule({
            behavior: {
              surface: "trpc.checkout.applyCoupon",
              inputs: { code: "string", cartCents: "number" },
              outputs: { discountCents: "number" },
              invariants: ["totalCents >= 0"],
              errors: [
                { code: "INVALID_COUPON", when: "code not recognized" },
              ],
            },
          }),
        ],
        filePath: "src/checkout/coupons.sps.yaml",
      },
    ];

    const output = generateAgentInstructions(specs, []);
    expect(output).toContain("Surface: `trpc.checkout.applyCoupon`");
    expect(output).toContain("Inputs: code: string, cartCents: number");
    expect(output).toContain("Outputs: discountCents: number");
    expect(output).toContain("Invariant: totalCents >= 0");
    expect(output).toContain("Error `INVALID_COUPON`: code not recognized");
  });

  it("renders superseded_by when present", () => {
    const specs: SpecFile[] = [
      {
        spec: "checkout/old",
        title: "Old",
        description: "",
        category: "business",
        touches: [],
        rules: [
          makeRule({
            id: "REQ-OLD-01",
            status: "active",
            title: "Old rule still active",
          }),
        ],
        filePath: "src/checkout/old.sps.yaml",
      },
    ];
    specs[0].rules[0].superseded_by = "REQ-NEW-09";

    const output = generateAgentInstructions(specs, []);
    expect(output).toContain("Superseded by: REQ-NEW-09");
  });
});
