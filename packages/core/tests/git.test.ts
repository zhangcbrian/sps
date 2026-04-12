import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSpecBranch, buildPrDescription } from "../src/git.js";
import type { TraceBlock } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const mockGit = {
  checkoutLocalBranch: vi.fn(),
  add: vi.fn(),
  commit: vi.fn(),
  push: vi.fn(),
};
vi.mock("simple-git", () => ({
  simpleGit: () => mockGit,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSpecBranch", () => {
  it("creates a branch with the configured prefix", async () => {
    await createSpecBranch(
      "/tmp/repo",
      "specs/checkout/coupons.spec.yaml",
      "domain: checkout\nmodule: coupons\n",
      DEFAULT_CONFIG,
      "coupon-support"
    );

    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith(
      "spec/coupon-support"
    );
    expect(mockGit.add).toHaveBeenCalledWith(
      "specs/checkout/coupons.spec.yaml"
    );
    expect(mockGit.commit).toHaveBeenCalledWith(
      expect.stringContaining("feat(spec):")
    );
  });

  it("pushes to remote when create_pr is true", async () => {
    await createSpecBranch(
      "/tmp/repo",
      "specs/checkout/coupons.spec.yaml",
      "content",
      DEFAULT_CONFIG,
      "coupon-support"
    );

    expect(mockGit.push).toHaveBeenCalledWith(
      "origin",
      "spec/coupon-support",
      ["--set-upstream"]
    );
  });
});

describe("buildPrDescription", () => {
  it("includes traceability info in PR description", () => {
    const trace: TraceBlock = {
      requested_by: "sarah@company.com",
      requested_at: "2026-04-12T14:30:00Z",
      original_text: "We need discount codes",
      interpretation_model: "claude-sonnet-4-6",
      interpretation_at: "2026-04-12T14:30:05Z",
      reviewed_by: "sarah@company.com",
      reviewed_at: "2026-04-12T14:31:00Z",
      source: "portal",
      related_specs: [],
      history: [],
    };

    const desc = buildPrDescription(trace, "checkout/coupons", 3);
    expect(desc).toContain("sarah@company.com");
    expect(desc).toContain("We need discount codes");
    expect(desc).toContain("3 rules");
    expect(desc).toContain("portal");
  });
});
