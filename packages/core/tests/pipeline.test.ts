import { describe, it, expect, vi } from "vitest";
import { submitRequirement, submitDraftFile } from "../src/pipeline.js";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("../src/interpret.js", () => ({
  interpret: vi.fn().mockResolvedValue({
    spec: "checkout/coupons",
    title: "Discount Codes",
    description: "Coupon support",
    category: "business",
    touches: [],
    rules: [
      {
        id: null,
        title: "Apply coupon",
        status: "proposed",
        category: "business",
        description: "Applies coupon",
        given: "A cart",
        when: "Coupon applied",
        then: "Discount shown",
        examples: [],
        edge_cases: [],
        tests: [],
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

vi.mock("../src/organize.js", async () => {
  const actual = await vi.importActual<typeof import("../src/organize.js")>(
    "../src/organize.js"
  );
  return actual;
});

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

    expect(result.filePath).toBe("src/checkout/coupons/coupons.sps.yaml");
    expect(result.branch).toBe("spec/coupon-support");
    expect(result.ruleCount).toBe(1);
    expect(result.deduplication.matches).toEqual([]);
  });
});

describe("submitDraftFile", () => {
  it("skips interpret + deduplicate when given a hand-authored YAML draft", async () => {
    const { interpret } = await import("../src/interpret.js");
    const { deduplicate } = await import("../src/deduplicate.js");
    const { createSpecBranch } = await import("../src/git.js");

    vi.mocked(interpret).mockClear();
    vi.mocked(deduplicate).mockClear();
    vi.mocked(createSpecBranch).mockClear();

    const dir = mkdtempSync(join(tmpdir(), "sps-offline-"));
    const draftPath = join(dir, "draft.yaml");
    writeFileSync(
      draftPath,
      `spec: billing/refunds
title: Refunds
description: Allow refunds within 30 days.
category: business
touches: []
rules:
  - id: null
    title: Refund within 30 days
    status: proposed
    category: business
    description: Customers can request a refund within 30 days.
    given: An order placed 5 days ago.
    when: The customer requests a refund.
    then: The refund is approved.
    examples: []
    edge_cases: []
    tests: []
`
    );

    const result = await submitDraftFile(dir, draftPath, {
      text: "(offline)",
      submittedBy: "test@test",
      source: "cli",
      mode: "quick",
    });

    expect(interpret).not.toHaveBeenCalled();
    expect(deduplicate).not.toHaveBeenCalled();
    expect(createSpecBranch).toHaveBeenCalledOnce();
    expect(result.ruleCount).toBe(1);
    expect(result.deduplication.matches).toEqual([]);
  });

  it("rejects malformed draft files", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-offline-"));
    const draftPath = join(dir, "broken.yaml");
    writeFileSync(draftPath, "this is not a valid spec\n");

    await expect(
      submitDraftFile(dir, draftPath, {
        text: "(offline)",
        submittedBy: "test@test",
        source: "cli",
        mode: "quick",
      })
    ).rejects.toThrow("rules");
  });

  it("rejects offline drafts that cite unresolved REQ-* IDs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-offline-"));
    const draftPath = join(dir, "draft.yaml");
    writeFileSync(
      draftPath,
      `spec: billing/refunds
title: Refunds
description: x
category: business
touches: []
rules:
  - id: REQ-BIL-REF-09
    title: Refund within 30 days
    status: active
    category: business
    description: Builds on REQ-GHOST-99 which does not exist.
    given: g
    when: w
    then: t
    examples: []
    edge_cases: []
    tests: []
`
    );

    await expect(
      submitDraftFile(dir, draftPath, {
        text: "(offline)",
        submittedBy: "test@test",
        source: "cli",
        mode: "quick",
      })
    ).rejects.toThrow("unresolved");
  });
});
