# @fcalell/plugin-vite

Framework-agnostic Vite lifecycle plugin for the `@fcalell/stack` framework. Provides Tailwind v4, theme FOUC prevention, and font preload with CLS prevention. This plugin is implicit -- it is never listed in consumer config. It is auto-resolved as a dependency of framework plugins like `plugin-solid`.

**Stack:** Vite + Tailwind v4 (all internal -- consumers don't import them)

## Install

```bash
pnpm add @fcalell/plugin-vite
```

Consumers typically do not install this directly. It is pulled in as a dependency of `@fcalell/plugin-solid`.

## How it works

`plugin-vite` owns the Vite lifecycle. Framework plugins (like `plugin-solid`) inject their Vite plugins by contributing to the `Codegen.ViteConfig` event during `stack generate`. The CLI aggregates contributions, writes `.stack/vite.config.ts`, and `plugin-vite` spawns the Vite process during `Dev.Start` / `Build.Start`.

Contributions are typed AST specs — `TsImportSpec` for imports and `TsExpression` for plugin calls — so plugin authors never concatenate source strings:

```ts
import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";

bus.on(Codegen.ViteConfig, (p) => {
  p.imports.push({ source: "vite-plugin-solid", default: "solidPlugin" });
  p.pluginCalls.push({
    kind: "call",
    callee: { kind: "identifier", name: "solidPlugin" },
    args: [],
  });
});
```

The generated config always includes Tailwind v4 and the theme/fonts plugin as base plugins, with framework-contributed plugins appended after.

## Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Vite dev server port |

Since this plugin is implicit, options are rarely set directly. When needed:

```ts
import { vite } from "@fcalell/plugin-vite";

// Typically auto-resolved, but can be explicit if customizing
vite({ port: 4000 })
```

## Events

| Event | Emitted by | Purpose |
|-------|------------|---------|
| `ViteConfigured` | `Dev.Start` | Signals that the Vite config has been generated and the dev server is starting. Framework plugins depend on this. |

## Lifecycle

```
Generate: Codegen.ViteConfig (framework plugins contribute typed imports + plugin calls; CLI writes .stack/vite.config.ts)
Dev:      Dev.Start (spawn vite dev, emit ViteConfigured)
Build:    Build.Start (push vite build step with output to dist/client)
```

### Dev

1. Framework plugins push `TsImportSpec`s and `TsExpression` plugin calls into the `Codegen.ViteConfig` payload during `stack generate`
2. The CLI aggregates and writes `.stack/vite.config.ts` via the AST printer
3. On `Dev.Start`, the plugin spawns `vite dev` using the generated config and emits `ViteConfigured`

### Build

1. `Codegen.ViteConfig` contributions are aggregated at generate time (same flow as Dev)
2. On `Build.Start`, the plugin pushes a `vite build` step (output to `dist/client`)

## Preset

The `./preset` subpath exports the Vite plugins that power the base preset:

```ts
import { createBasePreset, themeFontsPlugin } from "@fcalell/plugin-vite/preset";
```

### `themeFontsPlugin(fonts?)`

A Vite plugin that:

- Injects a synchronous anti-FOUC `<script>` into `<head>` that reads `localStorage.theme` (falling back to `prefers-color-scheme`) and sets `.dark` on `<html>` before first paint
- Emits `<link rel="preload" as="font" type="font/woff2" crossorigin>` for each font in the manifest
- Injects `@font-face` blocks with `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` so pre-swap and post-swap text occupy identical space (zero CLS)

### `createBasePreset(opts?)`

Returns a plugin array containing Tailwind v4 and `themeFontsPlugin`. Used internally by the generated Vite config.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-vite` | `vite()`, `ViteOptions` |
| `@fcalell/plugin-vite/preset` | `createBasePreset()`, `themeFontsPlugin()`, `BasePresetOptions` |

## License

MIT
