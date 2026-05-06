import { describe, it, expect, beforeEach } from "vitest";
import { diffSpecs } from "../src/diff.js";
import { loadSpecs } from "../src/loader.js";
import { simpleGit } from "simple-git";
import { mkdtempSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const SPEC_PATH = "src/checkout/checkout.sps.yaml";

const makeYaml = (
  ruleId: string,
  fields: { title?: string; status?: string; then?: string; supersededBy?: string } = {}
) => `
spec: checkout/checkout
title: Checkout
description: Checkout flow.
category: business
touches: []
rules:
  - id: ${ruleId}
    title: ${fields.title ?? "Apply discount"}
    status: ${fields.status ?? "active"}
    category: business
    description: Apply discount.
    given: Cart has items.
    when: Customer enters code.
    then: ${fields.then ?? "Discount applied."}${fields.supersededBy ? `\n    superseded_by: ${fields.supersededBy}` : ""}
    examples: []
    edge_cases: []
    tests: []
`;

async function makeGitRepo() {
  const dir = mkdtempSync(join(tmpdir(), "sls-diff-"));
  mkdirSync(join(dir, "src/checkout"), { recursive: true });
  const git = simpleGit(dir);
  await git.init();
  await git.addConfig("user.email", "test@test", false, "local");
  await git.addConfig("user.name", "Test", false, "local");
  await git.addConfig("commit.gpgsign", "false", false, "local");
  return { dir, git };
}

describe("diffSpecs", () => {
  let dir: string;
  let git: ReturnType<typeof simpleGit>;

  beforeEach(async () => {
    ({ dir, git } = await makeGitRepo());
  });

  it("reports an empty diff when nothing has changed", async () => {
    writeFileSync(join(dir, SPEC_PATH), makeYaml("REQ-CHK-FLOW-01"));
    await git.add(SPEC_PATH);
    await git.commit("initial");

    const specs = loadSpecs(dir);
    const diff = await diffSpecs(specs, dir, "HEAD");

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
    expect(diff.transitioned).toEqual([]);
    expect(diff.files_added).toEqual([]);
    expect(diff.files_removed).toEqual([]);
  });

  it("detects added rules", async () => {
    writeFileSync(join(dir, SPEC_PATH), makeYaml("REQ-CHK-FLOW-01"));
    await git.add(SPEC_PATH);
    await git.commit("initial");

    writeFileSync(
      join(dir, SPEC_PATH),
      makeYaml("REQ-CHK-FLOW-01") +
        `  - id: REQ-CHK-FLOW-02\n    title: New rule\n    status: proposed\n    category: business\n    description: New.\n    given: g\n    when: w\n    then: t\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );
    const specs = loadSpecs(dir);
    const diff = await diffSpecs(specs, dir, "HEAD");

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].ruleId).toBe("REQ-CHK-FLOW-02");
    expect(diff.added[0].status).toBe("proposed");
  });

  it("detects removed rules", async () => {
    writeFileSync(
      join(dir, SPEC_PATH),
      makeYaml("REQ-CHK-FLOW-01") +
        `  - id: REQ-CHK-FLOW-02\n    title: Old rule\n    status: active\n    category: business\n    description: x\n    given: g\n    when: w\n    then: t\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );
    await git.add(SPEC_PATH);
    await git.commit("initial");

    writeFileSync(join(dir, SPEC_PATH), makeYaml("REQ-CHK-FLOW-01"));
    const specs = loadSpecs(dir);
    const diff = await diffSpecs(specs, dir, "HEAD");

    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].ruleId).toBe("REQ-CHK-FLOW-02");
  });

  it("detects modified rules with field list", async () => {
    writeFileSync(join(dir, SPEC_PATH), makeYaml("REQ-CHK-FLOW-01", { then: "Original outcome." }));
    await git.add(SPEC_PATH);
    await git.commit("initial");

    writeFileSync(
      join(dir, SPEC_PATH),
      makeYaml("REQ-CHK-FLOW-01", { then: "New outcome." })
    );
    const specs = loadSpecs(dir);
    const diff = await diffSpecs(specs, dir, "HEAD");

    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].ruleId).toBe("REQ-CHK-FLOW-01");
    expect(diff.modified[0].fields).toContain("then");
  });

  it("classifies status changes as transitions, not modifications", async () => {
    writeFileSync(join(dir, SPEC_PATH), makeYaml("REQ-CHK-FLOW-01", { status: "active" }));
    await git.add(SPEC_PATH);
    await git.commit("initial");

    writeFileSync(
      join(dir, SPEC_PATH),
      makeYaml("REQ-CHK-FLOW-01", { status: "deprecated", supersededBy: "REQ-CHK-FLOW-02" })
    );
    const specs = loadSpecs(dir);
    const diff = await diffSpecs(specs, dir, "HEAD");

    expect(diff.modified).toHaveLength(0);
    expect(diff.transitioned).toHaveLength(1);
    expect(diff.transitioned[0].fromStatus).toBe("active");
    expect(diff.transitioned[0].toStatus).toBe("deprecated");
    expect(diff.transitioned[0].supersededBy).toBe("REQ-CHK-FLOW-02");
  });

  it("detects file additions and removals", async () => {
    writeFileSync(join(dir, SPEC_PATH), makeYaml("REQ-CHK-FLOW-01"));
    await git.add(SPEC_PATH);
    await git.commit("initial");

    const newPath = "src/billing/billing.sps.yaml";
    mkdirSync(join(dir, "src/billing"), { recursive: true });
    writeFileSync(
      join(dir, newPath),
      makeYaml("REQ-BIL-NEW-01").replace("checkout/checkout", "billing/billing")
    );

    unlinkSync(join(dir, SPEC_PATH));

    const specs = loadSpecs(dir);
    const diff = await diffSpecs(specs, dir, "HEAD");

    expect(diff.files_added).toContain(newPath);
    expect(diff.files_removed).toContain(SPEC_PATH);
  });
});
