# SPS 5-Hour Improvement Sprint Design

**Date:** 2026-04-12
**Status:** In Progress (autonomous sprint)
**Goal:** Close the most impactful gaps identified in the competitive analysis to differentiate SPS from GitHub Spec Kit and establish the AI agent integration story.

---

## Completed (Sprint Part 1)

### 1. Principles Support (.sps/principles.yaml) — DONE
- `loadPrinciples()` in `packages/core/src/principles.ts`
- 3 tests passing

### 2. Agent Instructions Generator — DONE
- `generateAgentInstructions()` in `packages/core/src/agent.ts`
- Generates structured CLAUDE.md from specs + principles
- 4 tests passing

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

## Remaining (Sprint Part 2)

### 7. Update README with new commands
Update README.md to document `sps agent`, `sps coverage`, principles, and the improved status.

### 8. Example .sps.yaml in sps init
When running `sps init`, generate an example `.sps.yaml` file that shows the format.

### 9. Validate touches references
Extend `sps validate` to check that `touches` references point to directories that actually exist in the repo.

### 10. Export manifest as JSON
Add `sps scan --json` flag to output manifest as JSON for CI integration.

### 11. Update portal to show principles
Add principles display to the portal dashboard.

### 12. Integration test: end-to-end sps agent workflow
Write a test that creates temp spec files, runs generateAgentInstructions, and verifies the output contains all expected sections.
