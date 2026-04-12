import { describe, it, expect } from "vitest";
import { buildTrace, appendHistory } from "../src/trace.js";

describe("buildTrace", () => {
  it("creates a trace block from submission context", () => {
    const trace = buildTrace(
      {
        text: "We need discount codes",
        submittedBy: "sarah@company.com",
        source: "portal",
        mode: "quick",
      },
      "claude-sonnet-4-6"
    );

    expect(trace.requested_by).toBe("sarah@company.com");
    expect(trace.original_text).toBe("We need discount codes");
    expect(trace.source).toBe("portal");
    expect(trace.interpretation_model).toBe("claude-sonnet-4-6");
    expect(trace.reviewed_by).toBeNull();
    expect(trace.reviewed_at).toBeNull();
    expect(trace.related_specs).toEqual([]);
    expect(trace.history).toHaveLength(1);
    expect(trace.history[0].action).toBe("created");
    expect(trace.history[0].by).toBe("sarah@company.com");
  });

  it("includes ISO timestamps", () => {
    const before = new Date().toISOString();
    const trace = buildTrace(
      {
        text: "test",
        submittedBy: "user@test.com",
        source: "cli",
        mode: "quick",
      },
      "claude-sonnet-4-6"
    );
    const after = new Date().toISOString();

    expect(trace.requested_at >= before).toBe(true);
    expect(trace.requested_at <= after).toBe(true);
  });
});

describe("appendHistory", () => {
  it("adds a history entry to an existing trace", () => {
    const trace = buildTrace(
      {
        text: "test",
        submittedBy: "user@test.com",
        source: "cli",
        mode: "quick",
      },
      "claude-sonnet-4-6"
    );

    const updated = appendHistory(trace, {
      action: "reviewed",
      by: "reviewer@test.com",
      reason: "Looks good",
    });

    expect(updated.history).toHaveLength(2);
    expect(updated.history[1].action).toBe("reviewed");
    expect(updated.history[1].by).toBe("reviewer@test.com");
    expect(updated.history[1].reason).toBe("Looks good");
  });
});
