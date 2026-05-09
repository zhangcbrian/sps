# sps — Development Guide

## Project Structure

pnpm monorepo with three packages:

```
packages/
  core/     @sps/core    — shared library (TypeScript)
  cli/      @sps/cli     — terminal interface (Commander); ships the `sps` bin
  portal/   @sps/portal  — web UI (Next.js 15, React 19)
```

## Commands

```bash
# Install dependencies
pnpm install

# Run all tests
cd packages/core && npx vitest run
cd packages/cli && npx vitest run

# Build portal
cd packages/portal && npm run build

# Run portal dev server
cd packages/portal && npm run dev
```

## Core Architecture

The core library (`packages/core/src/`) contains these modules:

| Module | Purpose |
|--------|---------|
| `types.ts` | All TypeScript interfaces — `SpsConfig`, `SpecFile`, `SpecRule`, `Manifest`, etc. |
| `config.ts` | Loads `.sps/config.yaml`, merges with defaults |
| `loader.ts` | Walks repo for `**/*.sps.yaml` files (skips node_modules, .git, dist, etc.) |
| `schema.ts` | Validates spec files against schema config |
| `scan.ts` | Builds manifest from specs — totals, cross-references, drift detection |
| `interpret.ts` | LLM: natural language -> draft spec (Claude API) |
| `deduplicate.ts` | LLM: compares draft against existing specs |
| `organize.ts` | Assigns co-located file paths and lineage IDs |
| `trace.ts` | Builds traceability metadata |
| `git.ts` | Creates branches, commits, PR descriptions |
| `pipeline.ts` | End-to-end orchestration: interpret -> deduplicate -> organize -> trace -> git |
| `principles.ts` | Loads `.sps/principles.yaml` |
| `agent.ts` | Generates AI agent instructions (CLAUDE.md) from specs |
| `coverage.ts` | Scans test files for lineage IDs, reports coverage gaps |
| `validate-touches.ts` | Checks `touches` references point to real directories |
| `validate-uniqueness.ts` | Hard-fails on duplicate rule IDs across the corpus (v0.2) |
| `validate-cross-refs.ts` | Hard-fails on REQ-* citations that don't resolve (v0.2) |
| `validate-mutations.ts` | Compares against a git ref; flags edits to active rules' g/w/t (v0.2) |

## CLI Commands

| Command | Purpose |
|---------|---------|
| `sps init` | Creates `.sps/config.yaml` |
| `sps submit "text"` | Full pipeline: interpret -> deduplicate -> place -> commit -> PR |
| `sps scan` | Force rebuild `.sps/manifest.yaml` |
| `sps status [dir]` | Health report (auto-rescans if stale) |
| `sps validate` | Schema check + cross-ref check + touches check |
| `sps validate --against=<ref>` | Add: mutation check against git ref (v0.2) |
| `sps show <ID>` | Print one rule compactly (v0.2) |
| `sps diff [ref]` | Rules added/modified/superseded/removed between refs (v0.2) |
| `sps agent` | Generate AI agent instructions from specs |
| `sps agent -o path` | Custom output path for agent instructions |
| `sps coverage` | Analyze test coverage of spec rules |
| `sps coverage --strict` | CI gate: fail if any rules lack tests |
| `sps mcp` | Run MCP server for agent integration (v0.2) |
| `sps lint` | Style/quality check (v0.2). v0.3: adds `forbidden_pattern_in_description` (default catches `#N`, `TKT-N`, `Phase N`) and `spec_file_too_large` (default 800 lines); `maxDescriptionWords` default tightened 200 → 100. Override defaults via `.sps/config.yaml` `lint:` block. |
| `sps doctor` | Combined health check: validate + coverage + scan + adoption checklist |
| `--json` | Every command accepts `--json` for machine-readable output |

## Conventions

- **Spec files:** `*.sps.yaml` — co-located with source code
- **Config:** `.sps/config.yaml` — global settings
- **Manifest:** `.sps/manifest.yaml` — auto-generated index
- **Principles:** `.sps/principles.yaml` — optional team principles
- **Lineage IDs:** `REQ-{DOMAIN}-{MODULE}-{NN}` format (e.g., `REQ-CHECKOUT-COUPON-01`)
- **Test traceability:** Include lineage IDs in test describe blocks: `describe("[REQ-CHECKOUT-COUPON-01] ...", () => {})`
- **Schema fields:** Spec files use `spec`, `title`, `description`, `category`, `touches`, `rules`. Rules use `id`, `title`, `status`, `category`, `description`, `given`, `when`, `then`. v0.2 adds optional `behavior:` block for structured invariants.
- **Forbidden fields:** `domain`, `module`, `business_title`, `summary` (old format — use `spec`, `title` instead)
- **Status enum:** `proposed | active | superseded | removed | deprecated`. Transitioning out of `active` requires `superseded_by: REQ-…` (v0.2).

## Testing

- **Framework:** Vitest
- **Mocks:** LLM calls mocked via `vi.mock("@anthropic-ai/sdk")`; git calls mocked via `vi.mock("simple-git")`

## Branching

Active development happens on feature branches; `v0.2` is the current working branch. PRs land on `main`.
