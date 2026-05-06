import { describe, it, expect, beforeEach } from "vitest";
import { validateMutations } from "../src/validate-mutations.js";
import { loadSpecs } from "../src/loader.js";
import { simpleGit } from "simple-git";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const SPEC_PATH = "src/checkout/checkout.sps.yaml";

const baseSpec = (then: string, status = "active") => `
spec: checkout/checkout
title: Checkout
description: |
  Checkout flow.
category: business
touches: []
rules:
  - id: REQ-CHK-FLOW-01
    title: Apply discount code
    status: ${status}
    category: business
    description: Apply discount.
    given: Cart has items.
    when: Customer enters code.
    then: ${then}
    examples: []
    edge_cases: []
    tests: []
`;

async function makeGitRepo() {
  const dir = mkdtempSync(join(tmpdir(), "specflow-mut-"));
  mkdirSync(join(dir, "src/checkout"), { recursive: true });
  const git = simpleGit(dir);
  await git.init();
  await git.addConfig("user.email", "test@test", false, "local");
  await git.addConfig("user.name", "Test", false, "local");
  await git.addConfig("commit.gpgsign", "false", false, "local");
  return { dir, git };
}

describe("validateMutations", () => {
  let dir: string;
  let git: ReturnType<typeof simpleGit>;

  beforeEach(async () => {
    ({ dir, git } = await makeGitRepo());
  });

  it("returns no errors when the rule is unchanged", async () => {
    writeFileSync(join(dir, SPEC_PATH), baseSpec("Discount applied."));
    await git.add(SPEC_PATH);
    await git.commit("initial");

    const specs = loadSpecs(dir);
    const errors = await validateMutations(specs, dir, "HEAD");
    expect(errors).toEqual([]);
  });

  it("flags edits to active rules' then clause", async () => {
    writeFileSync(join(dir, SPEC_PATH), baseSpec("Discount applied."));
    await git.add(SPEC_PATH);
    await git.commit("initial");

    writeFileSync(join(dir, SPEC_PATH), baseSpec("Discount applied differently now."));
    const specs = loadSpecs(dir);
    const errors = await validateMutations(specs, dir, "HEAD");

    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe("REQ-CHK-FLOW-01");
    expect(errors[0].field).toBe("then");
    expect(errors[0].before).toBe("Discount applied.");
    expect(errors[0].after).toBe("Discount applied differently now.");
  });

  it("ignores edits to non-active rules at the ref", async () => {
    writeFileSync(join(dir, SPEC_PATH), baseSpec("Discount applied.", "proposed"));
    await git.add(SPEC_PATH);
    await git.commit("initial");

    writeFileSync(join(dir, SPEC_PATH), baseSpec("Different text.", "proposed"));
    const specs = loadSpecs(dir);
    const errors = await validateMutations(specs, dir, "HEAD");
    expect(errors).toEqual([]);
  });

  it("ignores new specs not present at the ref", async () => {
    writeFileSync(join(dir, SPEC_PATH), baseSpec("Discount applied."));
    await git.add(SPEC_PATH);
    await git.commit("initial");

    const newPath = "src/billing/billing.sps.yaml";
    mkdirSync(join(dir, "src/billing"), { recursive: true });
    writeFileSync(
      join(dir, newPath),
      baseSpec("New rule here.").replace("REQ-CHK-FLOW-01", "REQ-BILL-NEW-01").replace(
        "checkout/checkout",
        "billing/billing"
      )
    );

    const specs = loadSpecs(dir);
    const errors = await validateMutations(specs, dir, "HEAD");
    expect(errors).toEqual([]);
  });

  it("ignores whitespace-only changes", async () => {
    writeFileSync(join(dir, SPEC_PATH), baseSpec("Discount applied."));
    await git.add(SPEC_PATH);
    await git.commit("initial");

    writeFileSync(
      join(dir, SPEC_PATH),
      baseSpec("Discount  applied.   ")
    );
    const specs = loadSpecs(dir);
    const errors = await validateMutations(specs, dir, "HEAD");
    expect(errors).toEqual([]);
  });

  it("flags an active rule that was silently removed from a spec", async () => {
    const fullSpec = `spec: checkout/checkout
title: Checkout
description: x
category: business
touches: []
rules:
  - id: REQ-CHK-FLOW-01
    title: Rule one
    status: active
    category: business
    description: x
    given: g
    when: w
    then: t
    examples: []
    edge_cases: []
    tests: []
  - id: REQ-CHK-FLOW-02
    title: Rule two
    status: active
    category: business
    description: x
    given: g
    when: w
    then: t
    examples: []
    edge_cases: []
    tests: []
`;
    writeFileSync(join(dir, SPEC_PATH), fullSpec);
    await git.add(SPEC_PATH);
    await git.commit("initial");

    // Remove the second rule.
    writeFileSync(
      join(dir, SPEC_PATH),
      fullSpec.replace(
        /  - id: REQ-CHK-FLOW-02[\s\S]*$/,
        ""
      )
    );

    const specs = loadSpecs(dir);
    const errors = await validateMutations(specs, dir, "HEAD");
    expect(
      errors.some(
        (e) =>
          e.ruleId === "REQ-CHK-FLOW-02" &&
          e.field === "transition" &&
          e.after === "(removed)"
      )
    ).toBe(true);
  });

  it("does not flag rules that moved to a different spec file", async () => {
    const oldPath = "src/checkout/checkout.sps.yaml";
    const oldSpec = `spec: checkout/checkout
title: Checkout
description: x
category: business
touches: []
rules:
  - id: REQ-CHK-FLOW-01
    title: Rule
    status: active
    category: business
    description: x
    given: g
    when: w
    then: t
    examples: []
    edge_cases: []
    tests: []
`;
    writeFileSync(join(dir, oldPath), oldSpec);
    await git.add(oldPath);
    await git.commit("initial");

    // Move the file.
    const newPath = "src/checkout/flow.sps.yaml";
    mkdirSync(join(dir, "src/checkout"), { recursive: true });
    writeFileSync(
      join(dir, newPath),
      oldSpec.replace("checkout/checkout", "checkout/flow")
    );
    // Remove the old file by overwriting and then physically deleting.
    // loadSpecs only sees what's on disk, so the simplest is to leave the
    // old path absent.
    const { unlinkSync } = await import("fs");
    unlinkSync(join(dir, oldPath));

    const specs = loadSpecs(dir);
    const errors = await validateMutations(specs, dir, "HEAD");
    expect(errors.filter((e) => e.field === "transition")).toEqual([]);
  });

  it("flags nested behavior changes (inputs/outputs/errors)", async () => {
    const withBehavior = (inputType: string) => `spec: checkout/checkout
title: Checkout
description: x
category: business
touches: []
rules:
  - id: REQ-CHK-FLOW-01
    title: Rule
    status: active
    category: business
    description: x
    given: g
    when: w
    then: t
    behavior:
      surface: trpc.checkout.flow
      inputs:
        limit: ${inputType}
    examples: []
    edge_cases: []
    tests: []
`;
    writeFileSync(join(dir, SPEC_PATH), withBehavior("number"));
    await git.add(SPEC_PATH);
    await git.commit("initial");

    writeFileSync(join(dir, SPEC_PATH), withBehavior("string"));

    const specs = loadSpecs(dir);
    const errors = await validateMutations(specs, dir, "HEAD");
    const behaviorError = errors.find((e) => e.field === "behavior");
    expect(behaviorError).toBeDefined();
    expect(behaviorError?.before).toContain("number");
    expect(behaviorError?.after).toContain("string");
  });
});
