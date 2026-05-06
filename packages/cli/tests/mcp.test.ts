import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildMcpServer } from "../src/commands/mcp.js";

const SPEC_BODY = `spec: checkout/coupons
title: Discount codes
description: Apply discount codes at checkout.
category: business
touches:
  - billing
rules:
  - id: REQ-CHK-COUPON-01
    title: Apply percentage discount
    status: active
    category: business
    description: Discount reduces cart total.
    given: Cart has $100 of items.
    when: Customer enters SAVE20.
    then: Total drops to $80.
    examples: []
    edge_cases: []
    tests: []
  - id: REQ-CHK-COUPON-02
    title: Reject expired codes
    status: proposed
    category: business
    description: Expired coupons are rejected.
    given: Coupon EXPIRED has lapsed.
    when: Customer enters EXPIRED.
    then: Error message shown.
    examples: []
    edge_cases: []
    tests: []
`;

async function startMcpClient(repoRoot: string): Promise<Client> {
  const server = buildMcpServer(repoRoot);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

function readToolJson(result: unknown): { content: Array<{ type: string; text: string }> } {
  return result as { content: Array<{ type: string; text: string }> };
}

describe("MCP server", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sls-mcp-"));
    mkdirSync(join(dir, "src/checkout/coupons"), { recursive: true });
    writeFileSync(join(dir, "src/checkout/coupons/coupons.sps.yaml"), SPEC_BODY);
  });

  it("registers all expected tools", async () => {
    const client = await startMcpClient(dir);
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "coverage_for_path",
      "diff_specs",
      "find_rules_by_touches",
      "get_principles",
      "get_rule",
      "list_rules",
      "list_specs",
      "search_rules",
    ]);
    await client.close();
  });

  it("list_rules returns all rules", async () => {
    const client = await startMcpClient(dir);
    const result = await client.callTool({ name: "list_rules", arguments: {} });
    const payload = JSON.parse(readToolJson(result).content[0].text);
    expect(payload.count).toBe(2);
    expect(payload.rules.map((r: { ruleId: string }) => r.ruleId).sort()).toEqual([
      "REQ-CHK-COUPON-01",
      "REQ-CHK-COUPON-02",
    ]);
    await client.close();
  });

  it("list_rules filters by status", async () => {
    const client = await startMcpClient(dir);
    const result = await client.callTool({
      name: "list_rules",
      arguments: { status: "active" },
    });
    const payload = JSON.parse(readToolJson(result).content[0].text);
    expect(payload.count).toBe(1);
    expect(payload.rules[0].ruleId).toBe("REQ-CHK-COUPON-01");
    await client.close();
  });

  it("get_rule returns a specific rule", async () => {
    const client = await startMcpClient(dir);
    const result = await client.callTool({
      name: "get_rule",
      arguments: { ruleId: "REQ-CHK-COUPON-01" },
    });
    const payload = JSON.parse(readToolJson(result).content[0].text);
    expect(payload.ok).toBe(true);
    expect(payload.rule.title).toBe("Apply percentage discount");
    expect(payload.specFile).toContain("coupons.sps.yaml");
    await client.close();
  });

  it("get_rule reports unknown IDs gracefully", async () => {
    const client = await startMcpClient(dir);
    const result = await client.callTool({
      name: "get_rule",
      arguments: { ruleId: "REQ-NOPE-99" },
    });
    const payload = JSON.parse(readToolJson(result).content[0].text);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("not found");
    await client.close();
  });

  it("find_rules_by_touches matches via touches list", async () => {
    const client = await startMcpClient(dir);
    const result = await client.callTool({
      name: "find_rules_by_touches",
      arguments: { path: "billing" },
    });
    const payload = JSON.parse(readToolJson(result).content[0].text);
    expect(payload.count).toBe(2);
    expect(payload.rules[0].matchedTouch).toBe("billing");
    await client.close();
  });

  it("search_rules ranks by field weight", async () => {
    const client = await startMcpClient(dir);
    const result = await client.callTool({
      name: "search_rules",
      arguments: { query: "expired" },
    });
    const payload = JSON.parse(readToolJson(result).content[0].text);
    expect(payload.count).toBe(1);
    expect(payload.hits[0].ruleId).toBe("REQ-CHK-COUPON-02");
    await client.close();
  });

  it("find_rules_by_touches matches after stripping monorepo roots", async () => {
    const client = await startMcpClient(dir);
    // The spec touches "billing"; the agent sends a real file path under
    // src/billing. After stripping src/, the match should hit.
    const result = await client.callTool({
      name: "find_rules_by_touches",
      arguments: { path: "src/billing/invoice.ts" },
    });
    const payload = JSON.parse(readToolJson(result).content[0].text);
    expect(payload.count).toBeGreaterThan(0);
    expect(payload.rules[0].matchedTouch).toBe("billing");
    await client.close();
  });

  it("find_rules_by_touches matches via apps/<name>/src prefix too", async () => {
    const client = await startMcpClient(dir);
    const result = await client.callTool({
      name: "find_rules_by_touches",
      arguments: { path: "apps/web/src/billing/invoice.ts" },
    });
    const payload = JSON.parse(readToolJson(result).content[0].text);
    expect(payload.count).toBeGreaterThan(0);
    await client.close();
  });

  it("find_rules_by_touches matches package-level touches like `billing` against packages/billing/<file>", async () => {
    const client = await startMcpClient(dir);
    const result = await client.callTool({
      name: "find_rules_by_touches",
      arguments: { path: "packages/billing/src/invoice.ts" },
    });
    const payload = JSON.parse(readToolJson(result).content[0].text);
    expect(payload.count).toBeGreaterThan(0);
    expect(payload.rules[0].matchedTouch).toBe("billing");
    await client.close();
  });

  it("get_principles returns an empty list when none configured", async () => {
    const client = await startMcpClient(dir);
    const result = await client.callTool({ name: "get_principles", arguments: {} });
    const payload = JSON.parse(readToolJson(result).content[0].text);
    expect(payload.count).toBe(0);
    expect(payload.principles).toEqual([]);
    await client.close();
  });
});
