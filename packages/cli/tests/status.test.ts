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

  it("reports spec counts from co-located .sps.yaml files", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sps-cli-test-"));
    mkdirSync(join(dir, "src/billing"), { recursive: true });
    writeFileSync(
      join(dir, "src/billing/billing.sps.yaml"),
      `spec: billing\ntitle: Billing\ndescription: Invoices\ncategory: business\ntouches: []\nrules:\n  - id: REQ-BIL-01\n    title: Create invoice\n    status: active\n    category: business\n    description: Creates invoice\n    given: A user\n    when: Request\n    then: Created\n    examples: []\n    edge_cases: []\n    tests: []\n`
    );

    process.chdir(dir);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));

    const { statusCommand } = await import("../src/commands/status.js");
    await statusCommand(undefined, {});

    console.log = origLog;
    process.chdir(origCwd);

    const output = logs.join("\n");
    expect(output).toContain("Total rules:");
    expect(output).toContain("1");
    expect(output).toContain("Active:");
  });
});
