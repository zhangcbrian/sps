import { describe, it, expect } from "vitest";
import { loadConfig, DEFAULT_CONFIG } from "../src/config.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadConfig", () => {
  it("returns default config when no .specflow directory exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "specflow-test-"));
    const config = loadConfig(dir);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("loads and merges config from .specflow/config.yaml", () => {
    const dir = mkdtempSync(join(tmpdir(), "specflow-test-"));
    mkdirSync(join(dir, ".specflow"));
    writeFileSync(
      join(dir, ".specflow/config.yaml"),
      `version: 1\nspecs_dir: requirements\ndomains:\n  billing: BIL\n`
    );
    const config = loadConfig(dir);
    expect(config.specs_dir).toBe("requirements");
    expect(config.domains.billing).toBe("BIL");
    expect(config.schema.required_top_level).toEqual(
      DEFAULT_CONFIG.schema.required_top_level
    );
  });

  it("deep merges schema overrides", () => {
    const dir = mkdtempSync(join(tmpdir(), "specflow-test-"));
    mkdirSync(join(dir, ".specflow"));
    writeFileSync(
      join(dir, ".specflow/config.yaml"),
      `version: 1\nschema:\n  forbidden_rule_fields: [rule, name]\n`
    );
    const config = loadConfig(dir);
    expect(config.schema.forbidden_rule_fields).toEqual(["rule", "name"]);
    expect(config.schema.required_rule_fields).toEqual(
      DEFAULT_CONFIG.schema.required_rule_fields
    );
  });
});
