# @fcalell/plugin-vite

Framework-agnostic Vite lifecycle plugin for the `@fcalell/stack` framework. Provides Tailwind v4 and the `virtual:stack-providers` module used by the generated app entry. Required by any framework plugin that runs a Vite dev/build pipeline (e.g. `plugin-solid`); list it explicitly alongside the framework plugin in your `stack.config.ts`.

**Stack:** Vite + Tailwind v4 (all internal -- consumers don't import them)

## Install

```bash
pnpm add @fcalell/plugin-vite
```

`stack init` adds this automatically when you pick `solid` in the interactive picker; `stack add solid` does the same for an existing project.

## How it works

`plugin-vite` owns the Vite lifecycle. Framework plugins (like `plugin-solid`) inject their Vite plugins by contributing to the `vite.events.ViteConfig` event during `stack generate`. The CLI aggregates contributions, writes `.stack/vite.config.ts`, and `plugin-vite` spawns the Vite process during `Dev.Start` / `Build.Start`.

Contributions are typed AST specs — `TsImportSpec` for imports and `TsExpression` for plugin calls — so plugin authors never concatenate source strings:

```ts
import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";

bus.on(vite.events.ViteConfig, (p) => {
  p.imports.push({ source: "vite-plugin-solid", default: "solidPlugin" });
  p.pluginCalls.push({
    kind: "call",
    callee: { kind: "identifier", name: "solidPlugin" },
    args: [],
  });
});
```

The generated config always includes Tailwind v4 and the providers virtual-module plugin as base plugins, with framework-contributed plugins appended after.

## Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Vite dev server port |

Default `vite()` is all most projects need. Override when customizing:

```ts
import { vite } from "@fcalell/plugin-vite";

vite({ port: 4000 })
```

## Events

| Event | Emitted by | Purpose |
|-------|------------|---------|
| `ViteConfigured` | `Generate` | Signals that the Vite config has been generated. Framework plugins depend on this so downstream work that needs Vite wiring can await it from any command (`stack generate`, `stack dev`, `stack build`, `stack deploy`). |

## Lifecycle

```
Generate: vite.events.ViteConfig (framework plugins contribute typed imports + plugin calls; CLI writes .stack/vite.config.ts)
          ViteConfigured (emitted after codegen — lets dependents run)
Dev:      Dev.Start (spawn vite dev)
Build:    Build.Start (push vite build step with output to dist/client)
```

### Dev

1. Framework plugins push `TsImportSpec`s and `TsExpression` plugin calls into the `vite.events.ViteConfig` payload during `stack generate`
2. The CLI aggregates and writes `.stack/vite.config.ts` via the AST printer
3. `ViteConfigured` fires during `Generate` so dependents (e.g. `plugin-solid`) can react regardless of the command
4. On `Dev.Start`, the plugin spawns `vite dev` using the generated config

### Build

1. `vite.events.ViteConfig` contributions are aggregated at generate time (same flow as Dev)
2. On `Build.Start`, the plugin pushes a `vite build` step (output to `dist/client`)

## Preset

The `./preset` subpath exports node-side Vite plugins used by the generated Vite config:

```ts
import { providersPlugin } from "@fcalell/plugin-vite/preset";
```

### `providersPlugin(opts?)`

A Vite plugin that resolves `virtual:stack-providers` — either to the generated `.stack/virtual-providers.tsx` when plugins have contributed providers, or to a framework-agnostic pass-through stub otherwise.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-vite` | `vite()`, `ViteOptions` |
| `@fcalell/plugin-vite/preset` | `providersPlugin()`, `ProvidersPluginOptions` |

## License

MIT
