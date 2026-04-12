import { describe, it, expect, vi } from "vitest";
import { submitRequirement } from "../src/pipeline.js";

vi.mock("../src/interpret.js", () => ({
  interpret: vi.fn().mockResolvedValue({
    domain: "checkout",
    module: "coupons",
    description: "Coupon support",
    rules: [
      {
        id: null,
        status: "proposed",
        summary: "Apply coupon",
        description: "Applies coupon",
        given: "A cart",
        when: "Coupon applied",
        then: "Discount shown",
        examples: [],
        edge_cases: [],
        tests: [],
        added: "2026-04-12",
        modified: null,
      },
    ],
  }),
}));

vi.mock("../src/deduplicate.js", () => ({
  deduplicate: vi.fn().mockResolvedValue({ matches: [] }),
}));

vi.mock("../src/git.js", () => ({
  createSpecBranch: vi
    .fn()
    .mockResolvedValue({ branch: "spec/coupon-support" }),
  buildPrDescription: vi.fn().mockReturnValue("PR description"),
}));

vi.mock("../src/loader.js", () => ({
  loadSpecs: vi.fn().mockReturnValue([]),
}));

describe("submitRequirement", () => {
  it("runs the full pipeline: interpret → deduplicate → organize → trace → git", async () => {
    const { interpret } = await import("../src/interpret.js");
    const { deduplicate } = await import("../src/deduplicate.js");
    const { createSpecBranch } = await import("../src/git.js");

    const result = await submitRequirement("/tmp/repo", {
      text: "We need coupon support",
      submittedBy: "sarah@company.com",
      source: "cli",
      mode: "quick",
    });

    expect(interpret).toHaveBeenCalledOnce();
    expect(deduplicate).toHaveBeenCalledOnce();
    expect(createSpecBranch).toHaveBeenCalledOnce();

    expect(result.filePath).toBe("specs/checkout/coupons.spec.yaml");
    expect(result.branch).toBe("spec/coupon-support");
    expect(result.ruleCount).toBe(1);
    expect(result.deduplication.matches).toEqual([]);
  });
});
