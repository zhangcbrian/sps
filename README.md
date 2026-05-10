# sps

Turn plain-English requirements into structured, traceable specs that live next to your code.

```
"Users need discount codes at checkout"
        |
        v
src/checkout/coupons/coupons.sps.yaml   (structured YAML, lineage IDs, given/when/then)
```

> Previously distributed as `@sls/*` and known as SpecFlow.

---

## Why

Requirements get lost. A PM describes a feature in Slack. An engineer interprets it differently. Six months later, nobody knows why a rule exists.

sps fixes this: one `.sps.yaml` file per feature area, co-located with the code, readable by both business users and engineers, tracked in git with full traceability.

## Get Started

```bash
sps init                                          # creates .sps/config.yaml + example spec
sps submit "users need discount codes at checkout" # LLM interprets → dedup → commit → PR
```

That's it. sps creates a `.sps.yaml` file next to your code, assigns lineage IDs, and opens a PR.

## What a Spec Looks Like

```yaml
# src/checkout/coupons/coupons.sps.yaml

spec: checkout/coupons
title: "Discount Codes"
description: >
  Allows customers to apply discount codes during checkout.
category: business
touches: [billing]                    # cross-cutting: also affects billing code

rules:
  - id: REQ-CHECKOUT-COUPON-01
    title: "Customers can use a percentage discount code"
    status: active
    category: business
    description: >
      Valid percentage coupon reduces cart total by the discount percentage.
    given: A customer has a cart totaling $100 and enters coupon SAVE20 (20% off).
    when: The customer applies the coupon at checkout.
    then: Cart total drops to $80. The $20 discount appears as a line item.
    examples:
      - input: { cart_cents: 10000, code: "SAVE20", value: 20 }
        output: { total_cents: 8000, discount_cents: 2000 }
    edge_cases:
      - case: "100% discount"
        decision: "Cart total becomes $0 — valid"
    tests: []

_trace:
  requested_by: sarah@company.com
  original_text: "We need to let users apply discount codes at checkout."
  source: portal
```

One file. Business title, engineering detail, Given/When/Then, examples, edge cases, and a full audit trail.

## Commands

```bash
sps init                  # Set up .sps/ config + example spec
sps submit "description"  # NL → structured spec → branch → PR
sps scan                  # Rebuild .sps/manifest.yaml (index of all specs)
sps status                # Health report: rules by category, touches graph
sps validate              # Schema check + cross-ref check + touches check
sps show <ID>             # Print one rule compactly (great for agent context)
sps diff [ref]            # Rules added/modified/superseded between refs
sps agent                 # Generate AI agent instructions from specs
sps coverage              # Which spec rules have test coverage?
sps mcp                   # Run MCP server for editor / agent integration
sps lint                  # Style/quality check (oversized rules, orphans, etc.)
sps doctor                # All of the above in one check
```

**Flags:** every command supports `--json`. `sps coverage --strict` and `sps validate --against=<ref>` are CI gates.

### Lint Categories

`sps lint` (configurable via `.sps/config.yaml` `lint:` block) flags:

| Category | Default | Description |
| --- | --- | --- |
| `rule_too_long` | `> 100 words` | Rule descriptions creeping past a 1–3 sentence summary. Move history to `notes`. |
| `spec_too_many_rules` | `> 30 rules` | One spec covering too many invariants — consider splitting. |
| `spec_file_too_large` | `> 800 lines` | File has grown past the point where contracts usually diverge. |
| `forbidden_pattern_in_description` | `#N`, `TKT-N`, `Phase N` | Ticket/PR/phase references in descriptions — belong in git history. |
| `missing_behavior_block` | behavioral title | Title suggests a behavioral surface but no `behavior:` block. |

Example override:

```yaml
# .sps/config.yaml
lint:
  max_description_words: 80
  max_spec_file_lines: 1000
  forbidden_patterns:
    - '#\d+'
    - 'TKT-\d+'
```

> **Breaking in v0.3:** `max_description_words` default is now 100 (was 200). Restore prior behavior with `lint.max_description_words: 200` in `.sps/config.yaml`.

## Connect Specs to Tests

Every rule gets a lineage ID (`REQ-CHECKOUT-COUPON-01`). Put it in your test:

```typescript
describe("[REQ-CHECKOUT-COUPON-01] Apply percentage coupon", () => {
  it("reduces cart total by discount percentage", () => { /* ... */ });
});
```

Then `sps coverage` tells you which rules have tests and which don't. `sps coverage --strict` fails CI if any are missing.

## Feed Specs to AI Agents

```bash
sps agent                                          # writes CLAUDE.md
sps agent -o .github/copilot-instructions.md       # or any agent format
```

Or run sps as an MCP server and let the agent query specs on demand:

```bash
sps mcp
```

The generated file contains every active rule as a behavioral contract (Given/When/Then), lineage IDs for test linking, and team principles. Your AI agent codes against the spec, not a vague prompt.

## Team Principles

Optional `.sps/principles.yaml` — rules your whole team follows:

```yaml
principles:
  - id: money-in-cents
    title: "Money in cents"
    description: "All monetary values are integers in cents. Never use floats."
```

Principles show up in `sps agent` output and on the portal dashboard.

## What's in Your Repo

```
.sps/
  config.yaml             # settings (categories, domains, LLM, git)
  manifest.yaml           # auto-generated index of all specs
  principles.yaml         # optional team principles
src/
  checkout/
    checkout.sps.yaml     # specs live next to the code they describe
    coupons/
      coupons.sps.yaml
      apply.ts
  billing/
    billing.sps.yaml
```

**Zero impact.** No build deps, no runtime deps, no CI changes unless you want them. Delete `.sps/` and your spec files — nothing else to clean up.

## Packages

| Package | What |
|---------|------|
| `@zhangcbrian/sps-core` | Engine: interpret, deduplicate, validate, scan, coverage, agent |
| `@zhangcbrian/sps-cli` | `sps` binary — all commands above |
| `@zhangcbrian/sps-portal` | Next.js web UI — submit, browse, review specs as readable cards |

## License

MIT
