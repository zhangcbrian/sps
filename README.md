# SPS (Spec, Plan, Ship)

Turn natural language requirements into structured, traceable `.sps.yaml` specs co-located with your code.

Business users describe features in plain English. SPS interprets them into structured YAML specs, deduplicates against existing specs, and commits them to your repo with full traceability.

## Packages

| Package | Description |
|---------|-------------|
| `@sps/core` | Shared library -- interpret, deduplicate, organize, validate, git |
| `@sps/cli` | Terminal interface -- `sps submit`, `sps status`, `sps validate` |
| `@sps/portal` | Web UI -- submit, review, browse specs in a browser |

## Quick Start

```bash
# Initialize in any git repo
npx @sps/cli init

# Submit a requirement
sps submit "Users need to apply discount codes at checkout"

# Scan for .sps.yaml files and build the manifest
sps scan

# Check spec health
sps status

# Validate all specs
sps validate

# Start the web portal (optional)
npx @sps/portal --repo .
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

## Zero-Impact Installation

SPS adds only two things to your repo:
- `.sps/` directory -- configuration (`config.yaml`) and manifest
- `.sps.yaml` files -- spec files co-located next to the code they describe

No build dependencies, no runtime impact, no CI changes (unless you want them). Works with any language, framework, or build system.

## License

MIT
