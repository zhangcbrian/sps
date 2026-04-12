import { describe, it, expect } from "vitest";
import { loadSpecs } from "../src/loader.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function createTempRepo() {
  const dir = mkdtempSync(join(tmpdir(), "specflow-test-"));
  mkdirSync(join(dir, "specs/billing"), { recursive: true });
  return dir;
}

describe("loadSpecs", () => {
  it("returns empty array when specs dir does not exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "specflow-test-"));
    const specs = loadSpecs(dir, "specs");
    expect(specs).toEqual([]);
  });

  it("loads spec files from nested directories", () => {
    const dir = createTempRepo();
    writeFileSync(
      join(dir, "specs/billing/invoices.spec.yaml"),
      `domain: billing\nmodule: invoices\ndescription: Invoice management\nrules:\n  - id: REQ-BIL-INV-01\n    status: active\n    summary: "Create invoice"\n    description: "Creates an invoice"\n    given: "A user"\n    when: "They request an invoice"\n    then: "An invoice is created"\n    examples: []\n    edge_cases: []\n    tests: []\n    added: "2026-04-12"\n    modified: null\n`
    );
    const specs = loadSpecs(dir, "specs");
    expect(specs).toHaveLength(1);
    expect(specs[0].domain).toBe("billing");
    expect(specs[0].module).toBe("invoices");
    expect(specs[0].rules[0].id).toBe("REQ-BIL-INV-01");
    expect(specs[0].filePath).toBe("specs/billing/invoices.spec.yaml");
  });

  it("skips template files in _templates directory", () => {
    const dir = createTempRepo();
    mkdirSync(join(dir, "specs/_templates"), { recursive: true });
    writeFileSync(
      join(dir, "specs/_templates/spec-template.yaml"),
      "domain: TEMPLATE"
    );
    const specs = loadSpecs(dir, "specs");
    expect(specs).toEqual([]);
  });
});
