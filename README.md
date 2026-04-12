# Specflow

Turn natural language requirements into structured, traceable specs in git.

Business users describe features in plain English. Specflow interprets them into structured YAML specs, deduplicates against existing specs, and commits them to your repo with full traceability.

## Packages

| Package | Description |
|---------|-------------|
| `@specflow/core` | Shared library — interpret, deduplicate, organize, validate, git |
| `@specflow/cli` | Terminal interface — `specflow submit`, `specflow status`, `specflow validate` |
| `@specflow/portal` | Web UI — submit, review, browse specs in a browser |

## Quick Start

```bash
# Initialize in any git repo
npx @specflow/cli init

# Submit a requirement
specflow submit "Users need to apply discount codes at checkout"

# Check spec health
specflow status

# Validate all specs
specflow validate

# Start the web portal (optional)
npx @specflow/portal --repo .
```

## How It Works

```
Business user describes a feature (portal or CLI)
    ↓
LLM interprets into structured spec YAML
    ↓
Deduplicates against existing specs
    ↓
Organizes into the right directory, assigns lineage IDs
    ↓
Commits to a branch, opens a PR
    ↓
Team reviews and merges
```

Every spec includes full traceability: who requested, what they said (verbatim), how the LLM interpreted it, who reviewed, when merged.

## Zero-Impact Installation

Specflow adds only two things to your repo:
- `.specflow/config.yaml` — configuration
- `specs/` — spec YAML files

No build dependencies, no runtime impact, no CI changes (unless you want them). Works with any language, framework, or build system.

## License

MIT
