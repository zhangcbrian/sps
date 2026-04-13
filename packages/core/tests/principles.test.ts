import { describe, it, expect } from "vitest";
import { loadPrinciples } from "../src/principles.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadPrinciples", () => {
  it("returns empty array when no principles file exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    const principles = loadPrinciples(dir);
    expect(principles).toEqual([]);
  });

  it("loads principles from .sps/principles.yaml", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, ".sps"));
    writeFileSync(
      join(dir, ".sps/principles.yaml"),
      `principles:\n  - id: no-silent-failures\n    title: "No silent failures"\n    description: "Every error path must log or return an error."\n  - id: money-in-cents\n    title: "Money in cents"\n    description: "All monetary values are integers in cents."\n`
    );
    const principles = loadPrinciples(dir);
    expect(principles).toHaveLength(2);
    expect(principles[0].id).toBe("no-silent-failures");
    expect(principles[0].title).toBe("No silent failures");
    expect(principles[1].id).toBe("money-in-cents");
  });

  it("returns empty array for malformed file", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, ".sps"));
    writeFileSync(join(dir, ".sps/principles.yaml"), "not: [valid: yaml:");
    const principles = loadPrinciples(dir);
    expect(principles).toEqual([]);
  });
});
