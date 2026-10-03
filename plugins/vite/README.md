# @fcalell/plugin-vite

Framework-agnostic Vite lifecycle plugin for the `@fcalell/stack` framework. Provides Tailwind v4 and the `virtual:stack-providers` module used by the generated app entry. Required by any framework plugin that runs a Vite dev/build pipeline; list it explicitly alongside the framework plugin in your `stack.config.ts`.

**Stack:** Vite + Tailwind v4 (all internal -- consumers don't import them)

## Install

```bash
pnpm add @fcalell/plugin-vite
```

The consumer declares `vite` itself (the plugin's `devDependencies`, which `stack init` writes): the generated config imports it, and the dev process and the build step run the consumer's own bin, resolved from its directory, so no PATH or registry lookup stands in.

## How it works

`plugin-vite` owns the Vite lifecycle and exposes `vite.slots.configImports` + `vite.slots.pluginCalls` as the contribution surfaces. Framework plugins inject their Vite plugins by contributing into those slots; `vite.slots.viteConfig` is a derived slot that aggregates everything into `.stack/vite.config.ts`. `plugin-vite` then contributes a `vite dev` process to `cliSlots.devProcesses` and a `vite build` step to `cliSlots.buildSteps`.

Contributions are typed AST specs — `TsImportSpec` for imports and `TsExpression` for plugin calls — so plugin authors never concatenate source strings:

```ts
import { vite } from "@fcalell/plugin-vite";
import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";

contributes: [
  vite.slots.configImports.contribute(
    (): TsImportSpec => ({ source: "framework-plugin", default: "frameworkPlugin" }),
  ),
  vite.slots.pluginCalls.contribute(
    (): TsExpression => ({
      kind: "call",
      callee: { kind: "identifier", name: "frameworkPlugin" },
      args: [],
    }),
  ),
],
```

The generated config always includes the providers virtual-module plugin as a base plugin, with framework-contributed plugins appended after.

## Guide

The consumer-facing options (`port`, `restart`, `maxRestarts`), the dev server and its API proxy
live in plugin-react's [`web-app.md`](../react/guide/web-app.md), indexed into a consumer's
`.stack/guide.md`: `react()` is the one plugin that runs on Vite, so a consumer meets `vite()`
there.

## Owned slots

| Slot | Kind | Purpose |
|------|------|---------|
| `vite.slots.configImports` | `list<TsImportSpec>` | Imports for `.stack/vite.config.ts` |
| `vite.slots.pluginCalls` | `list<TsExpression>` | Vite plugin call expressions |
| `vite.slots.resolveAliases` | `list<{ find, replacement }>` | `resolve.alias` entries |
| `vite.slots.devServerPort` | `value<number>` | Dev server port (defaults to `options.port ?? 3000`) |
| `vite.slots.watchIgnored` | `list<string>` | Globs rendered into `server.watch.ignored`, added to Vite's defaults; a plugin whose tool writes scratch files under `.stack/` contributes their glob |
| `vite.slots.viteConfig` | `derived<string \| null>` | Final `.stack/vite.config.ts` source |

## Lifecycle contributions

| `cliSlots` slot | Behavior |
|-----------------|----------|
| `artifactFiles` | Writes `.stack/vite.config.ts` from `vite.slots.viteConfig` |
| `devProcesses` | Spawns the consumer's `vite dev --config .stack/vite.config.ts`; the port is the generated config's `server.port` |
| `buildSteps` | `vite build --config .stack/vite.config.ts` (`main` phase), into the config's `build.outDir`, `dist/client` |

`plugin-vite` also contributes its dev-server localhost origin to `api.slots.devCorsOrigins` (gated on `app.origins` not being set) so the auth + worker CORS allow-list picks up the dev server without consumer config. That list applies only when the worker runs with `STACK_DEV`; a deploy never trusts localhost.

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
