# Specstory

**Turn natural language requirements into structured, traceable specs in git.**

Specstory is the bridge between what business users want and what engineers build against. Business users describe features in plain English. Specstory interprets them into structured YAML specs, deduplicates against existing specs, and commits the result to the repo with full traceability — who requested it, what they said, how the LLM interpreted it, who reviewed it, and when it shipped.

---

## The Problem

Requirements get lost. A PM describes a feature in Slack. An engineer interprets it differently. Six months later, nobody knows why a rule exists, who asked for it, or whether the implementation matches the original intent.

The gap between "what someone asked for" and "what got built" is where bugs, scope creep, and misalignment live.

## The Solution

One source of truth: **spec YAML files in git.** Every business rule is traceable from the original request through LLM interpretation to the final merged spec. Business users never see YAML — they see readable cards with plain-English titles. Engineers see the same specs with technical context. Both work from the same file.

---

## Architecture

Three packages sharing one core engine:

```
@specstory/core (shared library — the brains)
├── interpret.ts    — LLM: natural language → draft spec
├── deduplicate.ts  — compare against existing specs
├── organize.ts     — find right directory, assign lineage IDs
├── git.ts          — branch, commit, PR creation
├── schema.ts       — spec YAML validation
└── trace.ts        — traceability metadata

@specstory/cli (npm package — engineer interface)
└── imports @specstory/core

@specstory/portal (Next.js app — business user interface)
└── imports @specstory/core
```

**Git is source of truth.** No external database. The portal is a read/write view over the repo.

---

## How It Works

### The Flow

```
1. Business user describes a feature (portal or CLI)
       ↓
2. LLM interprets into structured spec YAML
       ↓
3. Deduplicates against existing specs
       ↓
4. Organizes into the right directory, assigns lineage IDs
       ↓
5. Commits to a branch, opens a PR
       ↓
6. Team reviews and merges
       ↓
7. Engineers build against the spec, write tests linked by lineage ID
```

### Portal Flow (business user)

1. Sarah opens the portal, clicks "Submit a Requirement"
2. Types: "We need to let users apply discount codes at checkout"
3. Picks a category: Business / Engineering / Security
4. Chooses quick mode (one-shot) or guided mode (interactive conversation)
5. The LLM generates a draft spec with rules, given/when/then, examples, edge cases
6. Sarah sees the draft as readable cards — not YAML
7. The system shows related existing specs (deduplication)
8. Sarah approves
9. Specstory creates a branch, commits the spec, opens a PR
10. An engineer reviews and merges

### CLI Flow (engineer)

```bash
$ specstory submit "add rate limiting to the booking API"

Interpreting requirement...

Found 1 related spec:
  REQ-RLIM-RLIM-02 (rate-limit) — related

Draft spec: api/booking-rate-limit (2 rules)
  REQ-API-BKLIM-01: Booking endpoint limited to 10 requests per minute
  REQ-API-BKLIM-02: Rate limit returns 429 with retry-after header

Review draft? [Y/n/edit] Y

Created branch: spec/api-booking-rate-limit
Committed: specs/api/booking-rate-limit.spec.yaml
PR #42 created
```

---

## The Spec Format

Each spec file is a YAML document with business rules. Every rule has two titles — one for business users, one for engineers — plus given/when/then scenarios readable by both.

```yaml
# --- Traceability (auto-generated, never hand-edited) ---
_trace:
  requested_by: "sarah@company.com"
  requested_at: "2026-04-12T14:30:00Z"
  original_text: >
    We need to let users apply discount codes at checkout.
    Should work with percentage and fixed-amount coupons.
    One coupon per order max.
  interpretation_model: "claude-sonnet-4-6"
  interpretation_at: "2026-04-12T14:30:05Z"
  reviewed_by: "brian@company.com"
  reviewed_at: "2026-04-12T15:00:00Z"
  source: "portal"
  related_specs:
    - id: REQ-PAY-CHECKOUT-03
      relationship: extends
      note: "Adds coupon support to existing checkout flow"
  history:
    - action: created
      by: "sarah@company.com"
      at: "2026-04-12T14:30:00Z"

# --- Business Rules ---
domain: checkout
module: coupons
description: >
  Allows customers to apply discount codes during checkout.
  Supports percentage-based and fixed-amount coupons with
  usage limits and expiration dates.

rules:
  - id: REQ-CHECKOUT-COUPON-01
    status: active
    category: business
    business_title: "Customers can use a percentage discount code at checkout"
    summary: "Valid percentage coupon reduces cart total by the discount percentage"
    description: >
      When a customer enters a valid, non-expired coupon code with a
      percentage discount type, the cart total is reduced by that
      percentage. The discount is calculated on the pre-tax subtotal.
    given: >
      A customer has a cart totaling $100 and enters coupon code
      SAVE20, which offers 20% off and hasn't expired.
    when: >
      The customer applies the coupon at checkout.
    then: >
      The cart total drops to $80, the $20 discount is shown as
      a line item, and the coupon is marked as applied.
    examples:
      - input: { cart_cents: 10000, code: "SAVE20", discount_type: "percentage", value: 20 }
        output: { total_cents: 8000, discount_cents: 2000 }
    edge_cases:
      - case: "100% discount"
        decision: "Cart total becomes $0 — this is valid"
        ref: "Product decision 2026-04-12"
    tests: []
    added: "2026-04-12"
    modified: null
```

### Seven layers of readability in one file

| Layer | Who reads it | Example |
|-------|-------------|---------|
| `business_title` | CEO, PM, stakeholder | "Customers can use a percentage discount code at checkout" |
| `summary` | Engineer | "Valid percentage coupon reduces cart total by the discount percentage" |
| `description` | PM + engineer | Detailed explanation with constraints |
| `given/when/then` | Everyone | Concrete scenario with real values |
| `examples` | Test generator | Input/output pairs for parametrized tests |
| `edge_cases` | PM + engineer | Documented boundary decisions |
| `_trace` | Auditor | Full history: who requested, what they said, who approved |

### Categories

Every rule has one category. Three defaults (teams can customize):

| Category | Color | Who cares | Example |
|----------|-------|-----------|---------|
| **Business** | Green | PM, founder | "Customers can apply discount codes" |
| **Engineering** | Blue | Engineers | "Health endpoint returns DB status" |
| **Security** | Red | Security team, legal | "API keys are hashed before storage" |

### Lineage IDs

Every rule gets a unique ID: `REQ-{DOMAIN}-{MODULE}-{NN}`

- `REQ-CHECKOUT-COUPON-01` — first rule in the checkout/coupons spec
- `REQ-REP-SCORE-05` — fifth rule in the reputation/scoring spec

Lineage IDs connect specs to tests. A test with `[REQ-CHECKOUT-COUPON-01]` in its `describe` block is traceable to the spec rule that requires it.

---

## Repo Configuration

A repo opts in by having a `.specstory/` directory:

```yaml
# .specstory/config.yaml
version: 1

specs_dir: specs

schema:
  required_top_level: [domain, module, description, rules]
  required_rule_fields: [id, status, category, business_title, summary, description, given, when, then]
  forbidden_rule_fields: [rule]
  id_format: "REQ-{DOMAIN}-{MODULE}-{NN}"

categories:
  - id: business
    label: "Business"
    description: "Affects users, revenue, or growth"
    color: "#00E5A0"
  - id: engineering
    label: "Engineering"
    description: "System correctness, reliability, maintainability"
    color: "#4B9EFF"
  - id: security
    label: "Security"
    description: "Data protection, abuse prevention, compliance"
    color: "#FF4B4B"

domains:
  checkout: CHECKOUT
  billing: BIL
  # ... team defines their own

llm:
  provider: anthropic
  model: claude-sonnet-4-6

git:
  branch_prefix: "spec/"
  commit_prefix: "feat(spec):"
  create_pr: true
  pr_platform: github

dedup:
  enabled: true
  similarity_threshold: 0.7
```

---

## The Portal

A Next.js web app for business users. Dark theme, card-based UI.

### Dashboard (`/`)

- Three category cards at the top: Business (134), Engineering (47), Security (38) — clickable to jump to that section
- Specs grouped by category, each card showing:
  - Business title (large heading)
  - Technical summary (monospace subtitle)
  - Colored Given/When/Then
  - Edge cases
  - Traceability footer (who requested, when, via what channel)

### Submit (`/submit`)

- Large text area: "Describe the feature you need"
- Category picker: "Why is this needed?" — three buttons (Business / Engineering / Security)
- Mode toggle: Quick (one-shot) vs Guided (interactive conversation)
- On submit: LLM interprets → deduplicates → shows draft as readable cards → user approves

### History (`/history`)

- Timeline of all submissions with traceability info
- Original text, interpretation, who reviewed, when merged

### Specs (`/specs`)

- Browse all spec rules rendered as readable cards
- Full traceability chain visible

---

## The CLI

```bash
# Initialize in any git repo
specstory init

# Submit a requirement (quick mode)
specstory submit "users need discount codes at checkout"

# Submit with guided conversation
specstory submit --guided

# Check spec health
specstory status

# Validate all specs against schema
specstory validate
```

---

## Zero-Impact Installation

Specstory adds only two things to your repo:

| Added | Purpose |
|-------|---------|
| `.specstory/config.yaml` | Configuration |
| `specs/` directory | Spec YAML files |

**Guarantees:**
- No build impact — no dependencies in the host project's package.json
- No runtime impact — spec YAML files are inert data
- No CI impact — unless you explicitly add validation
- Git-clean removal — delete `.specstory/` and `specs/`, nothing else to clean up
- Framework-agnostic — any language, any framework, any build system
- Never writes to main branch — all changes go through PRs

---

## Traceability Chain

Every requirement is fully traceable:

```
Who requested it (sarah@company.com)
    → What exactly they said (verbatim original text)
    → How the LLM interpreted it (model, timestamp)
    → What existing specs it relates to (deduplication results)
    → Who reviewed it (brian@company.com)
    → When it was approved
    → Which PR merged it
    → Full git history from there
    → Which tests verify it (lineage IDs in test describe blocks)
```

All of this lives in the spec YAML file and git history. No external database.

---

## Deduplication

When a new requirement comes in, Specstory compares it against all existing specs:

- **extends** — adds to an existing spec (e.g., "add coupon support" extends the checkout spec)
- **replaces** — supersedes an existing rule
- **conflicts** — contradicts an existing rule (flagged for human review)
- **related** — touches the same area but is independent

The user sees related specs before approving, so they can make an informed decision.

---

## Origin Story

Specstory grew out of building GhostNot's test assurance system. We started with a simple question: "how do we make sure every feature has tests?" The answer evolved through several iterations:

1. **Specs + BDD + Tests** — Three layers connected by lineage IDs. Worked, but BDD was a duplicate of specs that added maintenance burden with no value.

2. **Specs + Tests** — Removed BDD. Specs got given/when/then directly. Simpler, same traceability.

3. **Business-readable specs** — Added plain-English descriptions so product managers could read and review specs. Given/when/then in concrete scenarios with real dollar amounts.

4. **Categories** — Business / Engineering / Security. Every rule answers "why does this matter?"

5. **Business titles** — Two titles per rule: what a CEO sees ("You get your money back if you cancel early") vs what an engineer sees ("Early cancellations >24h get full refund with no penalty").

6. **Specstory** — Extracted the spec system into a standalone tool. Added LLM interpretation, deduplication, portal UI, CLI, and traceability.

### Lessons learned

- **Agents follow what's in front of them.** If the schema is in a separate file they need to read, they won't. Put critical rules inline in CLAUDE.md with examples.
- **Schema validators catch divergence.** Without `validate:schema`, agents invented their own YAML structures. With it, they can't.
- **Pre-commit hooks are the most valuable guardrail.** Lint + schema + typecheck + tests gating every commit caught every class of error.
- **The BDD layer wasn't worth it.** Given/when/then belong directly in specs. One file, not two.
- **Business users and engineers need different headings.** `business_title` solved this without duplicating the spec.
- **Three categories is enough.** More than that and people stop using them. Teams can add more if they need to.
- **Git is the right source of truth.** No database, no lock-in. Everything is in files with full version history.

---

## Current State (as of 2026-04-12)

### Packages

| Package | Status | Tests |
|---------|--------|-------|
| `@specstory/core` | Complete | 28 tests |
| `@specstory/cli` | Complete | 5 tests |
| `@specstory/portal` | Complete | Builds, renders |

### Proven with GhostNot

- 219 spec rules across 41 files
- 889 tests across 43 test files
- 100% spec-to-test coverage via lineage IDs
- Categories: Business (134), Engineering (47), Security (38)
- Business titles on all 219 rules
- Pre-commit hook: lint → schema → tsc → tests
- Portal renders all specs with category cards, business titles, given/when/then

### What's NOT in V1

- Role-based permissions (anyone can submit, anyone can review)
- Notifications (email/Slack when specs need review)
- Multiple LLM providers (Anthropic only, architecture supports others)
- GitLab/Bitbucket PR creation (GitHub only, pluggable)
- Guided mode implementation (flag accepted, not yet functional)
- Spec search in portal (planned)
- Local mode via Claude Code (no API key needed — Claude Code IS the LLM)

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Core library | TypeScript, `yaml`, Claude API SDK |
| CLI | TypeScript, `commander`, `chalk` |
| Portal | Next.js 15, React 19 |
| Git operations | `simple-git` |
| GitHub integration | `@octokit/rest` |
| Monorepo | pnpm workspaces |
| Testing | Vitest |

---

## File Structure

```
specstory/
├── packages/
│   ├── core/                     # @specstory/core
│   │   ├── src/
│   │   │   ├── config.ts         # load .specstory/config.yaml
│   │   │   ├── loader.ts         # read spec YAMLs from repo
│   │   │   ├── schema.ts         # validate against schema
│   │   │   ├── trace.ts          # traceability metadata
│   │   │   ├── organize.ts       # file placement + lineage IDs
│   │   │   ├── interpret.ts      # LLM: text → draft spec
│   │   │   ├── deduplicate.ts    # LLM: find related specs
│   │   │   ├── git.ts            # branch, commit, push
│   │   │   ├── pipeline.ts       # end-to-end orchestration
│   │   │   ├── types.ts          # all TypeScript types
│   │   │   └── index.ts          # re-exports
│   │   └── tests/                # 9 files, 28 tests
│   ├── cli/                      # @specstory/cli
│   │   ├── src/
│   │   │   ├── index.ts          # commander entry point
│   │   │   └── commands/
│   │   │       ├── init.ts       # specstory init
│   │   │       ├── submit.ts     # specstory submit
│   │   │       ├── status.ts     # specstory status
│   │   │       └── validate.ts   # specstory validate
│   │   └── tests/                # 3 files, 5 tests
│   └── portal/                   # @specstory/portal
│       └── src/
│           ├── app/
│           │   ├── page.tsx      # dashboard with category cards
│           │   ├── submit/       # requirement submission form
│           │   ├── specs/        # browse all rules
│           │   ├── history/      # submission timeline
│           │   └── api/          # submit + categories endpoints
│           └── components/
│               └── spec-card.tsx # business-readable rule card
├── README.md
└── SPECSTORY.md                  # this file
```
