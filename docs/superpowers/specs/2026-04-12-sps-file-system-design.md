# SPS File System Design

**Date:** 2026-04-12
**Status:** Approved
**Scope:** Rename from Specstory to SPS ("Spec, Plan, Ship"), replace centralized `specs/` directory with co-located `.sps.yaml` files, new manifest system.

---

## Summary

SPS replaces the Specstory system with a co-located file model. Instead of a separate `specs/` directory, spec files live next to the code they describe as `.sps.yaml` files. A root `.sps/` directory holds global config and an auto-generated manifest that indexes all specs across the repo.

The presence of an `.sps.yaml` file is the only opt-in required. No registration, no config entry. Drop a file, it's discovered.

---

## Brand

**SPS — Spec, Plan, Ship.**

| Old | New |
|---|---|
| `specstory` | `sps` |
| `@specstory/core` | `@sps/core` |
| `@specstory/cli` | `@sps/cli` |
| `@specstory/portal` | `@sps/portal` |
| `specstory` CLI command | `sps` |
| `.specstory/` | `.sps/` |
| `*.spec.yaml` | `*.sps.yaml` |

---

## File System Layout

```
myproject/
  .sps/
    config.yaml                    # global settings (human-edited)
    manifest.yaml                  # auto-generated index (committed, regenerable)
  src/
    checkout/
      checkout.sps.yaml            # top-level checkout specs
      coupons/
        coupons.sps.yaml           # granular coupon specs
        apply.ts
        validate.ts
      cart.ts
    billing/
      billing.sps.yaml
      invoices/
        invoices.sps.yaml
    auth/
      auth.sps.yaml
```

---

## `.sps.yaml` File Schema

Each spec file is self-contained and declares its own identity.

```yaml
spec: checkout/coupons                    # declared identity (slash-separated)
title: "Discount Codes"                   # human-readable name
description: >                            # what this spec covers
  Allows customers to apply discount codes during checkout.
  Supports percentage and fixed-amount coupons.

category: business                        # default category for rules in this file
touches: [billing, notifications]         # cross-cutting references to other directories

rules:
  - id: REQ-CHECKOUT-COUPON-01
    title: "Customers can use a percentage discount code"
    status: active                        # active | proposed | deprecated
    category: business                    # override file-level default if needed
    description: >
      Valid percentage coupon reduces cart total by the discount percentage,
      calculated on the pre-tax subtotal.
    given: >
      A customer has a cart totaling $100 and enters coupon SAVE20
      (20% off, not expired).
    when: The customer applies the coupon at checkout.
    then: >
      Cart total drops to $80. The $20 discount appears as a line item.
      Coupon is marked as applied.
    examples:
      - input: { cart_cents: 10000, code: "SAVE20", type: "percentage", value: 20 }
        output: { total_cents: 8000, discount_cents: 2000 }
    edge_cases:
      - case: "100% discount"
        decision: "Cart total becomes $0 — valid"
    tests: []

_trace:
  requested_by: sarah@company.com
  requested_at: "2026-04-12T14:30:00Z"
  original_text: >
    We need to let users apply discount codes at checkout.
  interpretation_model: claude-sonnet-4-6
  source: portal
  related_specs:
    - id: REQ-PAY-CHECKOUT-03
      relationship: extends
      note: "Adds coupon support to existing checkout flow"
  history:
    - action: created
      by: sarah@company.com
      at: "2026-04-12T14:30:00Z"
```

### Schema Changes from Old Format

| Old (`.spec.yaml`) | New (`.sps.yaml`) | Reason |
|---|---|---|
| `domain` + `module` (separate fields) | `spec: domain/module` (single field) | Path implies structure; one field is cleaner |
| `business_title` + `summary` | `title` (one field) | Unified; `description` carries the detail |
| No `touches` | `touches: [dir, ...]` | Cross-cutting references are first-class |
| `category` only on rules | `category` at file level + rule override | Most files are one category; reduce repetition |
| No `spec` identity field | `spec: checkout/coupons` | Self-describing; manifest validates against path |

**Dropped:** `domain`, `module` as separate top-level fields, `business_title` / `summary` split.

**Kept:** `_trace`, `rules` array, `given/when/then`, `examples`, `edge_cases`, `tests`, lineage IDs (`REQ-{DOMAIN}-{MODULE}-{NN}`).

---

## `.sps/` Directory

### `config.yaml`

Global settings, human-edited.

```yaml
version: 1

schema:
  required_fields: [spec, title, description, rules]
  required_rule_fields: [id, status, title, description, given, when, then]
  id_format: "REQ-{DOMAIN}-{MODULE}-{NN}"

categories:
  - id: business
    label: "Business"
    color: "#00E5A0"
  - id: engineering
    label: "Engineering"
    color: "#4B9EFF"
  - id: security
    label: "Security"
    color: "#FF4B4B"

domains:
  checkout: CHECKOUT
  billing: BIL

llm:
  provider: anthropic
  model: claude-sonnet-4-6

git:
  branch_prefix: "spec/"
  commit_prefix: "feat(spec):"
  create_pr: true

dedup:
  enabled: true
  similarity_threshold: 0.7
```

### `manifest.yaml`

Auto-generated index. Committed to git for performance. Always regenerable via `sps scan`.

```yaml
# AUTO-GENERATED — do not edit. Run `sps scan` to refresh.
generated_at: "2026-04-12T16:00:00Z"

specs:
  - path: src/checkout/checkout.sps.yaml
    spec: checkout
    title: "Checkout Flow"
    categories: [business, engineering]
    rule_count: 5
    touches: []
    status_summary: { active: 4, proposed: 1 }

  - path: src/checkout/coupons/coupons.sps.yaml
    spec: checkout/coupons
    title: "Discount Codes"
    categories: [business]
    rule_count: 3
    touches: [billing, notifications]
    status_summary: { active: 3 }

  - path: src/billing/billing.sps.yaml
    spec: billing
    title: "Billing & Invoicing"
    categories: [business, security]
    rule_count: 8
    touches: [checkout]
    status_summary: { active: 7, deprecated: 1 }

totals:
  files: 3
  rules: 16
  by_category: { business: 12, engineering: 2, security: 2 }
  by_status: { active: 14, proposed: 1, deprecated: 1 }

cross_references:
  billing:
    touched_by:
      - spec: checkout/coupons
        path: src/checkout/coupons/coupons.sps.yaml
        rules: [REQ-CHECKOUT-COUPON-01, REQ-CHECKOUT-COUPON-03]
  notifications:
    touched_by:
      - spec: checkout/coupons
        path: src/checkout/coupons/coupons.sps.yaml
        rules: [REQ-CHECKOUT-COUPON-02]

drift:
  - path: src/billing/billing.sps.yaml
    issue: "declared spec 'billing' but lives under 'src/billing/payments/'"
```

---

## Discovery & Staleness

### Discovery

The CLI walks the repo for `**/*.sps.yaml`. Respects `.gitignore`. Skips `node_modules/`, `.git/`, and common build output directories.

### Staleness Check

Before any command that reads specs, the CLI checks:

1. `manifest.yaml`'s `generated_at` timestamp
2. Git status — any `.sps.yaml` files changed since that timestamp
3. Quick glob — any `.sps.yaml` files with mtime newer than manifest

If stale, manifest rebuilds automatically before the command runs. If fresh, reads the cached manifest.

### Force Rescan

```bash
sps scan    # always rebuilds, regardless of staleness
```

---

## Cross-Cutting References

### The `touches` Field

A list of directory names that this spec affects beyond its own location. Values match the keys in `config.yaml`'s `domains` map (e.g., `billing`, `checkout`), not full file paths:

```yaml
spec: checkout/coupons
touches: [billing, notifications]
```

### Tooling Behavior

**Manifest** — builds a reverse index (`cross_references`) so both directions are queryable.

**CLI** — `sps status billing/` shows both billing's own specs and specs that touch billing:

```
billing/billing.sps.yaml — 8 rules (7 active, 1 deprecated)

Also touched by:
  checkout/coupons (coupons.sps.yaml) — 2 rules reference billing
```

**Deduplication** — when a new spec mentions billing, the deduplicator checks both `billing/*.sps.yaml` and any spec whose `touches` includes `billing`.

**Portal** — shows a "Referenced by" section on directory views.

### Boundaries

`touches` is informational. It does not create symlinks, copy rules, or enforce anything about the touched directory. The touched directory does not need its own `.sps.yaml`.

---

## CLI Commands

| Command | Behavior |
|---|---|
| `sps init` | Creates `.sps/config.yaml`. No `specs/` directory. |
| `sps submit "text"` | Interpret → deduplicate → suggest placement → user confirms → write `.sps.yaml` → commit → PR |
| `sps scan` | Force rebuild `.sps/manifest.yaml` |
| `sps status [dir]` | Auto-rescan if stale. Show health report. Optional directory filter. |
| `sps validate` | Schema check all `.sps.yaml` files + manifest drift detection. |

### Placement in `sps submit`

Since there's no fixed output directory, the CLI suggests placement:

1. LLM interprets the requirement
2. CLI examines existing `.sps.yaml` files and the `touches` graph
3. Suggests: "This looks like it belongs in `src/checkout/coupons/coupons.sps.yaml`"
4. User confirms or overrides
5. File written, manifest updated, branch + commit created

---

## Packages

| Package | Export | Purpose |
|---|---|---|
| `@sps/core` | Library | Engine: interpret, deduplicate, organize, validate, scan, git |
| `@sps/cli` | `sps` binary | Terminal interface |
| `@sps/portal` | Web app | Business user interface |

### Core Library Changes

| Module | Change |
|---|---|
| `loadSpecs()` | Glob `**/*.sps.yaml` instead of reading `specs_dir` |
| `loadConfig()` | Read `.sps/config.yaml` instead of `.specstory/config.yaml` |
| `organize()` | Suggest co-located path instead of subdirectory in `specs/` |
| `schema.ts` | Updated for new field names (`spec`, `title`, `touches`, file-level `category`) |
| `scan.ts` | **New** — walks repo, builds manifest, detects drift |
| `pipeline.ts` | Updated for new schema and placement logic |
| `types.ts` | Updated types for new schema |

### Portal Changes

- Dashboard reads manifest for grouping instead of scanning `specs/`
- Specs page becomes a tree view mirroring repo structure
- Submit page adds "Where should this live?" step after LLM interpretation
- Cross-references shown inline via manifest's `cross_references`

---

## Migration

**Not needed for V1.** Project is pre-production. Old `specs/`, `.specstory/`, and `*.spec.yaml` files will be deleted and replaced with the new system.

Migration tooling (`sps migrate`) can be added later for external users adopting from older versions.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| File presence = opt-in | Zero ceremony. No config entry needed. |
| Self-contained files with `spec:` identity | Portable, safe to reorganize. Manifest cross-checks for drift. |
| Manifest is derived, not authoritative | Always regenerable. Committed for performance. |
| Cross-cutting via `touches` | One canonical home per spec. Explicit outward references. Reverse index in manifest. |
| Unified `title` field | Replaces `business_title` / `summary` split. Simpler without losing readability. |
| File-level `category` default | Reduces repetition. Rules override when needed. |
| Clean slate, no migration | Pre-production. Build the right thing, don't bridge from the old thing. |
| Smart staleness | Auto-rescan when stale, manual force with `sps scan`. Fast path for unchanged repos. |
