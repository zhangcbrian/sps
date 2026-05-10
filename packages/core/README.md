# @sps/core

Shared library for the [sps](https://github.com/zhangcbrian/sps) project — interpret, deduplicate, validate, scan, and report on structured specs.

This package is the engine that powers [`@sps/cli`](https://www.npmjs.com/package/@sps/cli) and the sps portal. Most users want the CLI directly:

```bash
npm install -g @sps/cli
```

## Programmatic use

```ts
import { loadConfig, loadSpecs, buildManifest, lintSpecs } from "@sps/core";

const config = loadConfig(process.cwd());
const specs = loadSpecs(process.cwd());
const manifest = buildManifest(specs, config);
const findings = lintSpecs(specs);
```

See the [project README](https://github.com/zhangcbrian/sps#readme) for the full module surface, schema, and conventions.

## License

MIT
