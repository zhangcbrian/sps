# SPS (Spec, Plan, Ship)

Turn natural language requirements into structured, traceable `.sps.yaml` specs co-located with your code.

Business users describe features in plain English. SPS interprets them into structured YAML specs, deduplicates against existing specs, and commits them to your repo with full traceability.

## Packages

| Package | Description |
|---------|-------------|
| `@sps/core` | Shared library -- interpret, deduplicate, organize, validate, git |
| `@sps/cli` | Terminal interface -- `sps` commands |
| `@sps/portal` | Web UI -- submit, review, browse specs in a browser |

## Quick Start

```bash
# Initialize in any git repo
sps init

# Submit a requirement
sps submit "Users need to apply discount codes at checkout"

# Scan for .sps.yaml files and build the manifest
sps scan

# Check spec health (with category breakdown and touches graph)
sps status

# Validate all specs
sps validate

# Generate AI agent instructions from specs
sps agent

# Check which spec rules have test coverage
sps coverage
```

## How It Works

```
Business user describes a feature (portal or CLI)
    |
LLM interprets into structured .sps.yaml spec
    |
Deduplicates against existing specs
    |
Organizes into the right directory, assigns lineage IDs
    |
Commits to a branch, opens a PR
    |
Team reviews and merges
```

Every spec includes full traceability: who requested, what they said (verbatim), how the LLM interpreted it, who reviewed, when merged.

## AI Agent Integration

SPS generates structured instructions for AI coding agents:

```bash
# Generate CLAUDE.md from all specs + principles
sps agent

# Custom output path
sps agent --output .github/copilot-instructions.md
```

The generated file includes all active spec rules with Given/When/Then contracts, lineage IDs for test linking, and team principles. This makes SPS specs the input format your AI agents consume.

## Test Coverage

SPS tracks which spec rules have test coverage by scanning test files for lineage IDs:

```bash
# Report coverage
sps coverage

# CI gate: fail if any rules lack tests
sps coverage --strict
```

Link tests to specs by including the lineage ID in your test describe block:

```typescript
describe("[REQ-CHECKOUT-COUPON-01] Apply discount code", () => {
  it("reduces cart total by the discount percentage", () => {
    // ...
  });
});
```

## Principles

Define team-wide principles in `.sps/principles.yaml`:

```yaml
principles:
  - id: no-silent-failures
    title: "No silent failures"
    description: "Every error path must log, alert, or return an error."
  - id: money-in-cents
    title: "Money in cents"
    description: "All monetary values are integers in cents."
```

Principles are included in `sps agent` output so AI agents follow your team's rules.

## Zero-Impact Installation

SPS adds only two things to your repo:
- `.sps/` directory -- configuration (`config.yaml`), manifest, optional principles
- `.sps.yaml` files -- spec files co-located next to the code they describe

No build dependencies, no runtime impact, no CI changes (unless you want them). Works with any language, framework, or build system.

## Commands

| Command | Description |
|---------|-------------|
| `sps init` | Initialize SPS in the current repo |
| `sps submit "text"` | Interpret, deduplicate, place, commit, PR |
| `sps scan` | Rebuild `.sps/manifest.yaml` |
| `sps status [dir]` | Health report with category breakdown |
| `sps status --json` | Machine-readable status output |
| `sps validate` | Schema check all `.sps.yaml` files |
| `sps agent` | Generate AI agent instructions (CLAUDE.md) |
| `sps agent -o path` | Custom output path for agent instructions |
| `sps coverage` | Test coverage report for spec rules |
| `sps coverage --strict` | Fail if any rules lack test coverage |

## License

MIT
