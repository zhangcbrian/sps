import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
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

describe("validate command", () => {
  let origCwd: string;

  beforeEach(() => {
    origCwd = process.cwd();
  });

  it("passes for valid specs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "specflow-cli-test-"));
    mkdirSync(join(dir, "specs/test"), { recursive: true });
    writeFileSync(
      join(dir, "specs/test/mod.spec.yaml"),
      `domain: test\nmodule: mod\ndescription: Test\nrules:\n  - id: REQ-TEST-01\n    status: active\n    summary: Rule\n    description: A rule\n    given: Precondition\n    when: Action\n    then: Outcome\n    examples: []\n    edge_cases: []\n    tests: []\n    added: "2026-04-12"\n    modified: null\n`
    );

    process.chdir(dir);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));

    const { validateCommand } = await import("../src/commands/validate.js");
    await validateCommand();

    console.log = origLog;
    process.chdir(origCwd);

    expect(logs.join("\n")).toContain("conform to schema");
  });

  it("fails for invalid specs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "specflow-cli-test-"));
    mkdirSync(join(dir, "specs/test"), { recursive: true });
    writeFileSync(
      join(dir, "specs/test/bad.spec.yaml"),
      `domain: test\nmodule: bad\ndescription: Bad\nrules:\n  - id: REQ-TEST-01\n    status: active\n    rule: "Should be summary"\n`
    );

    process.chdir(dir);

    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => errors.push(args.join(" "));

    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    const { validateCommand } = await import("../src/commands/validate.js");
    await expect(validateCommand()).rejects.toThrow("process.exit");

    console.error = origError;
    mockExit.mockRestore();
    process.chdir(origCwd);

    expect(errors.join("\n")).toContain("validation failed");
  });
});
