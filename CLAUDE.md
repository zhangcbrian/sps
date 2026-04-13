# SPS (Spec, Plan, Ship) — Development Guide

## Project Structure

pnpm monorepo with three packages:

```
packages/
  core/     @sps/core    — shared library (TypeScript)
  cli/      @sps/cli     — terminal interface (Commander)
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

## CLI Commands

| Command | Purpose |
|---------|---------|
| `sps init` | Creates `.sps/config.yaml` |
| `sps submit "text"` | Full pipeline: interpret -> deduplicate -> place -> commit -> PR |
| `sps scan` | Force rebuild `.sps/manifest.yaml` |
| `sps status [dir]` | Health report (auto-rescans if stale) |
| `sps validate` | Schema check all `.sps.yaml` files + touches warnings |
| `sps agent` | Generate AI agent instructions from specs |
| `sps agent -o path` | Custom output path for agent instructions |
| `sps coverage` | Analyze test coverage of spec rules |
| `sps coverage --strict` | CI gate: fail if any rules lack tests |
| `sps doctor` | Combined health check: validate + coverage + scan |
| `sps status --json` | Machine-readable status output |
| `sps scan --json` | Output manifest as JSON |

## Conventions

- **Spec files:** `*.sps.yaml` — co-located with source code
- **Config:** `.sps/config.yaml` — global settings
- **Manifest:** `.sps/manifest.yaml` — auto-generated index
- **Principles:** `.sps/principles.yaml` — optional team principles
- **Lineage IDs:** `REQ-{DOMAIN}-{MODULE}-{NN}` format (e.g., `REQ-CHECKOUT-COUPON-01`)
- **Test traceability:** Include lineage IDs in test describe blocks: `describe("[REQ-CHECKOUT-COUPON-01] ...", () => {})`
- **Schema fields:** Spec files use `spec`, `title`, `description`, `category`, `touches`, `rules`. Rules use `id`, `title`, `status`, `category`, `description`, `given`, `when`, `then`.
- **Forbidden fields:** `domain`, `module`, `business_title`, `summary` (old format — use `spec`, `title` instead)

## Testing

- **Framework:** Vitest
- **Core:** 60 tests across 16 test files
- **CLI:** 5 tests across 3 test files
- **Portal:** No unit tests (verified via build)
- **Mocks:** LLM calls mocked via `vi.mock("@anthropic-ai/sdk")`; git calls mocked via `vi.mock("simple-git")`

## Current Branch

`feat/sps-rename-restructure` — major rename from Specstory/Specflow to SPS with co-located `.sps.yaml` files replacing centralized `specs/` directory.
