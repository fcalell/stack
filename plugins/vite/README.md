# @fcalell/plugin-vite

Framework-agnostic Vite lifecycle plugin for the `@fcalell/stack` framework. Provides Tailwind v4 and the `virtual:stack-providers` module used by the generated app entry. Required by any framework plugin that runs a Vite dev/build pipeline (e.g. `plugin-solid`); list it explicitly alongside the framework plugin in your `stack.config.ts`.

**Stack:** Vite + Tailwind v4 (all internal -- consumers don't import them)

## Install

```bash
pnpm add @fcalell/plugin-vite
```

`stack init` adds this automatically when you pick `solid` in the interactive picker; `stack add solid` does the same for an existing project.

## How it works

`plugin-vite` owns the Vite lifecycle and exposes `vite.slots.configImports` + `vite.slots.pluginCalls` as the contribution surfaces. Framework plugins (like `plugin-solid`) inject their Vite plugins by contributing into those slots; `vite.slots.viteConfig` is a derived slot that aggregates everything into `.stack/vite.config.ts`. `plugin-vite` then contributes a `vite dev` process to `cliSlots.devProcesses` and a `vite build` step to `cliSlots.buildSteps`.

Contributions are typed AST specs — `TsImportSpec` for imports and `TsExpression` for plugin calls — so plugin authors never concatenate source strings:

```ts
import { vite } from "@fcalell/plugin-vite";
import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";

contributes: [
  vite.slots.configImports.contribute(
    (): TsImportSpec => ({ source: "vite-plugin-solid", default: "solidPlugin" }),
  ),
  vite.slots.pluginCalls.contribute(
    (): TsExpression => ({
      kind: "call",
      callee: { kind: "identifier", name: "solidPlugin" },
      args: [],
    }),
  ),
],
```

The generated config always includes the providers virtual-module plugin as a base plugin (and Tailwind v4 once `plugin-solid-ui` is in the config), with framework-contributed plugins appended after.

## Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Vite dev server port |

Default `vite()` is all most projects need. Override when customizing:

```ts
import { vite } from "@fcalell/plugin-vite";

vite({ port: 4000 })
```

## Owned slots

| Slot | Kind | Purpose |
|------|------|---------|
| `vite.slots.configImports` | `list<TsImportSpec>` | Imports for `.stack/vite.config.ts` |
| `vite.slots.pluginCalls` | `list<TsExpression>` | Vite plugin call expressions |
| `vite.slots.resolveAliases` | `list<{ find, replacement }>` | `resolve.alias` entries |
| `vite.slots.devServerPort` | `value<number>` | Dev server port (defaults to `options.port ?? 3000`) |
| `vite.slots.viteConfig` | `derived<string \| null>` | Final `.stack/vite.config.ts` source |

## Lifecycle contributions

| `cliSlots` slot | Behavior |
|-----------------|----------|
| `artifactFiles` | Writes `.stack/vite.config.ts` from `vite.slots.viteConfig` |
| `devProcesses` | Spawns `vite dev --config .stack/vite.config.ts --port <devServerPort>` |
| `buildSteps` | `vite build --config .stack/vite.config.ts --outDir dist/client` (`main` phase) |

`plugin-vite` also contributes its dev-server localhost origin to `api.slots.corsOrigins` (gated on `app.origins` not being set) so the auth + worker CORS allow-list automatically picks up the dev server without consumer config.

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
