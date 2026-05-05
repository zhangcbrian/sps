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

  it("passes for valid .sps.yaml specs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    mkdirSync(join(dir, "src/test"), { recursive: true });
    writeFileSync(
      join(dir, "src/test/test.sps.yaml"),
      `spec: test/mod\ntitle: Test\ndescription: Test\ncategory: business\ntouches: []\nrules:\n  - id: REQ-TEST-01\n    title: Rule\n    status: active\n    category: business\n    description: A rule\n    given: Precondition\n    when: Action\n    then: Outcome\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );

    process.chdir(dir);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));

    const { validateCommand } = await import("../src/commands/validate.js");
    await validateCommand();

    console.log = origLog;
    process.chdir(origCwd);

    expect(logs.join("\n")).toContain("All 1 spec file(s) valid");
  });

  it("fails for duplicate rule IDs across files", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    mkdirSync(join(dir, "src/a"), { recursive: true });
    mkdirSync(join(dir, "src/b"), { recursive: true });
    const ruleYaml = (specName: string) =>
      `spec: ${specName}\ntitle: T\ndescription: T\ncategory: business\ntouches: []\nrules:\n  - id: REQ-DUP-X-01\n    title: Rule\n    status: active\n    category: business\n    description: r\n    given: g\n    when: w\n    then: t\n    examples: []\n    edge_cases: []\n    tests: []\n`;
    writeFileSync(join(dir, "src/a/a.sps.yaml"), ruleYaml("a/a"));
    writeFileSync(join(dir, "src/b/b.sps.yaml"), ruleYaml("b/b"));

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

    expect(errors.join("\n")).toContain("Duplicate rule IDs");
    expect(errors.join("\n")).toContain("REQ-DUP-X-01");
  });

  it("fails for unresolved cross-references", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    mkdirSync(join(dir, "src/a"), { recursive: true });
    writeFileSync(
      join(dir, "src/a/a.sps.yaml"),
      `spec: a/a\ntitle: A\ndescription: A\ncategory: business\ntouches: []\nrules:\n  - id: REQ-A-X-01\n    title: Rule\n    status: active\n    category: business\n    description: Builds on REQ-GHOST-99.\n    given: g\n    when: w\n    then: t\n    examples: []\n    edge_cases: []\n    tests: []\n`
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

    expect(errors.join("\n")).toContain("Unresolved cross-references");
    expect(errors.join("\n")).toContain("REQ-GHOST-99");
  });

  it("emits JSON with --json flag", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    mkdirSync(join(dir, "src/test"), { recursive: true });
    writeFileSync(
      join(dir, "src/test/test.sps.yaml"),
      `spec: test/mod\ntitle: Test\ndescription: Test\ncategory: business\ntouches: []\nrules:\n  - id: REQ-TEST-01\n    title: Rule\n    status: active\n    category: business\n    description: A rule\n    given: g\n    when: w\n    then: t\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );

    process.chdir(dir);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));

    const { validateCommand } = await import("../src/commands/validate.js");
    await validateCommand({ json: true });

    console.log = origLog;
    process.chdir(origCwd);

    const parsed = JSON.parse(logs.join("\n"));
    expect(parsed.ok).toBe(true);
    expect(parsed.spec_count).toBe(1);
    expect(parsed.duplicates).toEqual([]);
    expect(parsed.unresolved_refs).toEqual([]);
  });

  it("fails for invalid specs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    mkdirSync(join(dir, "src/test"), { recursive: true });
    writeFileSync(
      join(dir, "src/test/bad.sps.yaml"),
      `spec: test/bad\ntitle: Bad\ndescription: Bad\ncategory: business\ntouches: []\nrules:\n  - id: REQ-TEST-01\n    status: active\n    summary: "Should be title"\n`
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
