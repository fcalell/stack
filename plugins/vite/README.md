# @fcalell/plugin-vite

Framework-agnostic Vite lifecycle plugin for the `@fcalell/stack` framework. Provides Tailwind v4, the `virtual:stack-providers` module used by the generated app entry and the `virtual:stack-schema` module a `Form` derives its fields from. Required by any framework plugin that runs a Vite dev/build pipeline; list it explicitly alongside the framework plugin in your `stack.config.ts`.

**Stack:** Vite + Tailwind v4 (all internal -- consumers don't import them)

## Install

```bash
stack add vite
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
| `vite.slots.clientHeaders` | `map<string>` | Headers every response of the web client's host carries: `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`, contributed by vite itself, so no stack app is framed and there is no option to allow it. Header names compare case-insensitively; several `Content-Security-Policy` contributions merge per directive (see [Content-Security-Policy](#content-security-policy)), any other header set twice is a conflict. Rendered into the config's `server.headers` (Vite sends them on documents, the SPA fallback and modules, never on a proxied worker path); cloudflare writes them to `_headers` and node's static server sets them |
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

### `schemaPlugin(opts?)`

A Vite plugin that resolves `virtual:stack-schema` to the generated `.stack/schema.ts` (each procedure's input as JSON Schema, written by `stack generate`), or to an empty record before the first generate.

## Content-Security-Policy

`vite()` has no CSP option. A consumer's own plugin, in `stack.config.ts`, contributes a policy to
`vite.slots.clientHeaders`, and it is merged with vite's default `frame-ancestors 'none'`:

```ts
import { defineConfig, plugin } from "@fcalell/cli";
import { vite } from "@fcalell/plugin-vite";

// `package` points the CLI at this file, which exports the plugin as `csp`.
export const csp = plugin("csp", {
  label: "Content-Security-Policy",
  package: "./stack.config.ts",
  contributes: [
    vite.slots.clientHeaders.contribute(() => ({
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; img-src 'self' data: https:",
    })),
  ],
});

export default defineConfig({
  app: { name: "my-app", domain: "my-app.example" },
  plugins: [vite(), csp() /* , the rest */],
});
```

Contributions merge per directive: every directive any of them names is kept, in first-seen order,
and the sources of a directive several name are unioned in first-seen order. `'none'` survives only
where every contribution says `'none'` (beside real sources it drops), so the policy above still
carries `frame-ancestors 'none'`. Any other header two plugins set throws, and the policy reaches
the dev server, cloudflare's `_headers` and node's static server as one string.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-vite` | `vite()`, `ViteOptions` |
| `@fcalell/plugin-vite/preset` | `providersPlugin()`, `ProvidersPluginOptions`, `schemaPlugin()`, `SchemaPluginOptions` |

## License

MIT
