import { describe, it, expect } from "vitest";
import { validateTouches } from "../src/validate-touches.js";
import type { SpecFile } from "../src/types.js";
import { mkdtempSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const makeSpec = (spec: string, touches: string[], filePath: string): SpecFile => ({
  spec,
  title: "Test",
  description: "Test",
  category: "business",
  touches,
  rules: [],
  filePath,
});

describe("validateTouches", () => {
  it("returns no warnings when touches point to existing directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "src/billing"), { recursive: true });

    const specs = [makeSpec("checkout", ["billing"], "src/checkout/checkout.sps.yaml")];
    const warnings = validateTouches(specs, dir);
    expect(warnings).toEqual([]);
  });

  it("warns when touches reference non-existent directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));

    const specs = [makeSpec("checkout", ["billing", "notifications"], "src/checkout/checkout.sps.yaml")];
    const warnings = validateTouches(specs, dir);
    expect(warnings).toHaveLength(2);
    expect(warnings[0].touch).toBe("billing");
    expect(warnings[1].touch).toBe("notifications");
  });

  it("returns empty for specs with no touches", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    const specs = [makeSpec("checkout", [], "src/checkout/checkout.sps.yaml")];
    const warnings = validateTouches(specs, dir);
    expect(warnings).toEqual([]);
  });

  it("checks root-level directories too", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, "billing"), { recursive: true });

    const specs = [makeSpec("checkout", ["billing"], "src/checkout/checkout.sps.yaml")];
    const warnings = validateTouches(specs, dir);
    expect(warnings).toEqual([]);
  });
});
