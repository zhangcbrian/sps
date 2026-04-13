# SPS 5-Hour Improvement Sprint Design

**Date:** 2026-04-12
**Status:** Complete
**Goal:** Close the most impactful gaps identified in the competitive analysis to differentiate SPS from GitHub Spec Kit and establish the AI agent integration story.

---

## Completed (Sprint Part 1)

### 1. Principles Support (.sps/principles.yaml) — DONE
- `loadPrinciples()` in `packages/core/src/principles.ts`
- 3 tests passing

### 2. Agent Instructions Generator — DONE
- `generateAgentInstructions()` in `packages/core/src/agent.ts`
- Generates structured CLAUDE.md from specs + principles
- 4 tests passing + 1 integration test

### 3. Test Coverage Analysis — DONE
- `analyzeCoverage()` in `packages/core/src/coverage.ts`
- Scans test files for `REQ-*` lineage IDs, reports coverage gaps
- 4 tests passing

### 4. CLI Commands — DONE
- `sps agent` — generates CLAUDE.md from specs
- `sps coverage` — reports test coverage of spec rules (--strict for CI)

### 5. CLAUDE.md Dogfooding — DONE
- Written for the SPS repo itself

### 6. Improved `sps status` — DONE
- Category breakdown
- Cross-cutting references (touches graph)
- `--json` flag for programmatic consumption

---

## Completed (Sprint Part 2)

### 7. README Update — DONE
- Full command reference table
- Agent integration, coverage, and principles sections

### 8. Example .sps.yaml in `sps init` — DONE
- Generates `.sps/example.sps.yaml` with annotated format
- Init test updated to verify example file

### 9. Validate Touches References — DONE
- `validateTouches()` in `packages/core/src/validate-touches.ts`
- Checks `src/{touch}`, `{touch}`, `packages/{touch}` paths
- Integrated into `sps validate` as warnings (not failures)
- 4 tests passing

### 10. `sps scan --json` — DONE
- Outputs manifest as JSON for CI integration

### 11. Portal Principles Display — DONE
- Dashboard shows team principles from `.sps/principles.yaml`
- Portal build verified

### 12. Agent Integration Test — DONE
- End-to-end test creating specs on disk, loading, generating instructions
- Verifies principles, active rules, edge cases, deprecated exclusion

---

## Final Stats

- **65 tests** across 19 test files (16 core + 3 CLI)
- **28 commits** on `feat/sps-rename-restructure`
- **Portal builds** clean
- **9 CLI commands:** init, submit, scan, status, validate, agent, coverage + scan --json, status --json
- **New core modules:** principles.ts, agent.ts, coverage.ts, validate-touches.ts
