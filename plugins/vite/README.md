# @fcalell/plugin-vite

Framework-agnostic Vite lifecycle plugin for the `@fcalell/stack` framework. Provides Tailwind v4, theme FOUC prevention, and font preload with CLS prevention. This plugin is implicit -- it is never listed in consumer config. It is auto-resolved as a dependency of framework plugins like `plugin-solid`.

**Stack:** Vite + Tailwind v4 (all internal -- consumers don't import them)

## Install

```bash
pnpm add @fcalell/plugin-vite
```

Consumers typically do not install this directly. It is pulled in as a dependency of `@fcalell/plugin-solid`.

## How it works

`plugin-vite` owns the Vite lifecycle. It listens for `Dev.Start` and `Build.Start` events, generates `.stack/vite.config.ts` from collected plugin contributions, and spawns the Vite process.

Framework plugins (like `plugin-solid`) inject their Vite plugins by pushing into the `Dev.Configure` / `Build.Configure` payload:

```ts
bus.on(Dev.Configure, (p) => {
  p.viteImports.push('import solidPlugin from "vite-plugin-solid";');
  p.vitePluginCalls.push("solidPlugin()");
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
Dev:     Dev.Configure (framework plugins inject) → Dev.Start (generate config, spawn vite dev, emit ViteConfigured)
Build:   Build.Configure (framework plugins inject) → Build.Start (generate config, push vite build step)
```

### Dev

1. Framework plugins push `viteImports` and `vitePluginCalls` into the `Dev.Configure` payload
2. On `Dev.Start`, the plugin reads the collected payload, generates `.stack/vite.config.ts`, and spawns `vite dev`
3. Emits `ViteConfigured` so downstream plugins know Vite is ready

### Build

1. Framework plugins push imports/calls into the `Build.Configure` payload
2. On `Build.Start`, the plugin generates `.stack/vite.config.ts` and pushes a `vite build` step (output to `dist/client`)

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
