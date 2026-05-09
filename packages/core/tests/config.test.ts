import { describe, it, expect } from "vitest";
import { loadConfig, DEFAULT_CONFIG } from "../src/config.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadConfig", () => {
  it("returns default config when no .sps directory exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    const config = loadConfig(dir);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("default config has no specs_dir", () => {
    expect("specs_dir" in DEFAULT_CONFIG).toBe(false);
  });

  it("default config requires new field names", () => {
    expect(DEFAULT_CONFIG.schema.required_fields).toContain("spec");
    expect(DEFAULT_CONFIG.schema.required_fields).toContain("title");
    expect(DEFAULT_CONFIG.schema.required_fields).not.toContain("domain");
    expect(DEFAULT_CONFIG.schema.required_fields).not.toContain("module");
  });

  it("default config forbids old field names", () => {
    expect(DEFAULT_CONFIG.schema.forbidden_rule_fields).toContain("summary");
    expect(DEFAULT_CONFIG.schema.forbidden_rule_fields).toContain("business_title");
  });

  it("loads and merges config from .sps/config.yaml", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, ".sps"));
    writeFileSync(
      join(dir, ".sps/config.yaml"),
      `version: 1\ndomains:\n  billing: BIL\n`
    );
    const config = loadConfig(dir);
    expect(config.domains.billing).toBe("BIL");
    expect(config.schema.required_fields).toEqual(
      DEFAULT_CONFIG.schema.required_fields
    );
  });

  it("deep merges schema overrides", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, ".sps"));
    writeFileSync(
      join(dir, ".sps/config.yaml"),
      `version: 1\nschema:\n  forbidden_rule_fields: [rule, name, summary, business_title]\n`
    );
    const config = loadConfig(dir);
    expect(config.schema.forbidden_rule_fields).toEqual(["rule", "name", "summary", "business_title"]);
    expect(config.schema.required_rule_fields).toEqual(
      DEFAULT_CONFIG.schema.required_rule_fields
    );
  });

  it("loads a lint config block (snake_case fields)", () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-test-"));
    mkdirSync(join(dir, ".sps"));
    writeFileSync(
      join(dir, ".sps/config.yaml"),
      `version: 1
lint:
  max_description_words: 80
  max_spec_file_lines: 0
  forbidden_patterns: []
`
    );
    const config = loadConfig(dir);
    expect(config.lint?.max_description_words).toBe(80);
    expect(config.lint?.max_spec_file_lines).toBe(0);
    expect(config.lint?.forbidden_patterns).toEqual([]);
  });
});
