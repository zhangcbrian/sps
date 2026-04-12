import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("chalk", () => ({
  default: {
    green: (s: string | number) => String(s),
    yellow: (s: string | number) => String(s),
    red: (s: string | number) => String(s),
    bold: (s: string) => s,
    dim: (s: string | number) => String(s),
  },
}));

describe("status command", () => {
  let origCwd: string;

  beforeEach(() => {
    origCwd = process.cwd();
  });

  it("reports spec counts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "specflow-cli-test-"));
    mkdirSync(join(dir, "specs/billing"), { recursive: true });
    writeFileSync(
      join(dir, "specs/billing/invoices.spec.yaml"),
      `domain: billing\nmodule: invoices\ndescription: Invoices\nrules:\n  - id: REQ-BIL-INV-01\n    status: active\n    summary: Create invoice\n    description: Creates invoice\n    given: A user\n    when: Request\n    then: Created\n    examples: []\n    edge_cases: []\n    tests: []\n    added: "2026-04-12"\n    modified: null\n`
    );

    process.chdir(dir);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));

    const { statusCommand } = await import("../src/commands/status.js");
    await statusCommand({});

    console.log = origLog;
    process.chdir(origCwd);

    const output = logs.join("\n");
    expect(output).toContain("Total rules:");
    expect(output).toContain("1");
    expect(output).toContain("Active:");
  });
});
