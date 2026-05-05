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

const SPEC_BODY = `spec: test/mod
title: Test
description: Test
category: business
touches: []
rules:
  - id: REQ-TEST-X-01
    title: Sample rule
    status: active
    category: business
    description: A description here.
    given: Precondition
    when: Action
    then: Outcome
    examples: []
    edge_cases:
      - case: Empty cart
        decision: Reject
    tests: []
`;

describe("show command", () => {
  let origCwd: string;

  beforeEach(() => {
    origCwd = process.cwd();
  });

  it("prints rule details for a known ID", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-show-"));
    mkdirSync(join(dir, "src/test"), { recursive: true });
    writeFileSync(join(dir, "src/test/test.sps.yaml"), SPEC_BODY);
    process.chdir(dir);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));

    const { showCommand } = await import("../src/commands/show.js");
    showCommand("REQ-TEST-X-01");

    console.log = origLog;
    process.chdir(origCwd);

    const out = logs.join("\n");
    expect(out).toContain("REQ-TEST-X-01");
    expect(out).toContain("Sample rule");
    expect(out).toContain("Precondition");
    expect(out).toContain("Outcome");
    expect(out).toContain("Empty cart");
  });

  it("emits JSON with --json", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-show-"));
    mkdirSync(join(dir, "src/test"), { recursive: true });
    writeFileSync(join(dir, "src/test/test.sps.yaml"), SPEC_BODY);
    process.chdir(dir);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));

    const { showCommand } = await import("../src/commands/show.js");
    showCommand("REQ-TEST-X-01", { json: true });

    console.log = origLog;
    process.chdir(origCwd);

    const parsed = JSON.parse(logs.join("\n"));
    expect(parsed.ok).toBe(true);
    expect(parsed.rule.id).toBe("REQ-TEST-X-01");
    expect(parsed.rule.title).toBe("Sample rule");
    expect(parsed.specFile).toContain("test.sps.yaml");
  });

  it("exits 1 when ID not found", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-show-"));
    mkdirSync(join(dir, "src/test"), { recursive: true });
    writeFileSync(join(dir, "src/test/test.sps.yaml"), SPEC_BODY);
    process.chdir(dir);

    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => errors.push(args.join(" "));

    const mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => {
        throw new Error("process.exit");
      });

    const { showCommand } = await import("../src/commands/show.js");
    expect(() => showCommand("REQ-NOPE-99")).toThrow("process.exit");

    console.error = origError;
    mockExit.mockRestore();
    process.chdir(origCwd);

    expect(errors.join("\n")).toContain("not found");
  });
});
