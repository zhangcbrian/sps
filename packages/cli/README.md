# @sps/cli

The `sps` command-line interface — manage structured specs co-located with your code.

## Install

```bash
npm install -g @sps/cli
# or one-off
npx @sps/cli init
```

## Quick start

```bash
sps init                  # create .sps/config.yaml
sps submit "spec text"    # interpret -> deduplicate -> place -> commit -> PR
sps scan                  # rebuild .sps/manifest.yaml
sps status                # health report
sps validate              # schema + cross-refs + touches
sps lint                  # style/quality checks
sps coverage              # test coverage of spec rules
sps doctor                # combined health check
sps mcp                   # run MCP server for agent integration
```

Every command accepts `--json` for machine-readable output.

## Documentation

Full README and conventions live at the [project root](https://github.com/zhangcbrian/sps#readme).

## License

MIT
