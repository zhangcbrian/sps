import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";

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

  it("creates .sps/config.yaml only — no specs directory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    process.chdir(dir);

    const { initCommand } = await import("../src/commands/init.js");
    await initCommand();

    expect(existsSync(join(dir, ".sps/config.yaml"))).toBe(true);
    expect(existsSync(join(dir, ".sps/example.sps.yaml"))).toBe(true);
    expect(existsSync(join(dir, "specs"))).toBe(false);

    const config = readFileSync(join(dir, ".sps/config.yaml"), "utf-8");
    expect(config).toContain("required_fields");
    expect(config).toContain("anthropic");
    expect(config).not.toContain("specs_dir");

    const example = readFileSync(join(dir, ".sps/example.sps.yaml"), "utf-8");
    expect(example).toContain("spec:");
    expect(example).toContain("given:");
    expect(example).toContain("when:");
    expect(example).toContain("then:");

    process.chdir(origCwd);
  });

  it("skips if config already exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    process.chdir(dir);

    const { initCommand } = await import("../src/commands/init.js");
    await initCommand();
    await initCommand();

    process.chdir(origCwd);
  });
});
