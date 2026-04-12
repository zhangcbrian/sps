import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";

// Mock chalk to avoid ESM issues in tests
vi.mock("chalk", () => ({
  default: {
    green: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s,
  },
}));

describe("init command", () => {
  let origCwd: string;

  beforeEach(() => {
    origCwd = process.cwd();
  });

  it("creates .specflow/config.yaml and specs directory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "specflow-cli-test-"));
    process.chdir(dir);

    const { initCommand } = await import("../src/commands/init.js");
    await initCommand();

    expect(existsSync(join(dir, ".specflow/config.yaml"))).toBe(true);
    expect(existsSync(join(dir, "specs/_templates/spec-template.yaml"))).toBe(true);

    const config = readFileSync(join(dir, ".specflow/config.yaml"), "utf-8");
    expect(config).toContain("specs_dir");
    expect(config).toContain("anthropic");

    process.chdir(origCwd);
  });

  it("skips if config already exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "specflow-cli-test-"));
    process.chdir(dir);

    const { initCommand } = await import("../src/commands/init.js");
    await initCommand(); // first run
    await initCommand(); // second run — should skip

    process.chdir(origCwd);
  });
});
