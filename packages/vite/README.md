# @fcalell/vite

Base Vite preset for the `@fcalell/stack` framework. Provides SolidJS compilation, Tailwind v4 processing, and theme/font FOUC prevention.

**Stack:** Vite + vite-plugin-solid + @tailwindcss/vite (all internal -- consumers don't import them)

## Install

```bash
pnpm add @fcalell/vite
```

## Usage

This package provides the foundation that the CLI and plugins build on. Consumers rarely need it directly -- the `stack` CLI orchestrates Vite via `stack dev` and `stack build`.

For standalone use or customization:

```ts
// vite.config.ts
import { defineConfig } from "@fcalell/vite";

export default defineConfig({
  plugins: [myPlugin()],
  server: { port: 4000 },
});
```

## `createBasePreset()`

Returns the core Vite plugin array:

```ts
import { createBasePreset } from "@fcalell/vite";

const plugins = createBasePreset({ fonts: customFonts });
```

Includes:
- **SolidJS** -- JSX compilation via `vite-plugin-solid`
- **Tailwind v4** -- CSS processing via `@tailwindcss/vite`
- **Theme FOUC prevention** -- synchronous `<script>` injected into `<head>` that reads `localStorage.theme` (falling back to `prefers-color-scheme`) and toggles `.dark` on `<html>` before first paint
- **Font preload + CLS prevention** -- emits `<link rel="preload" as="font" type="font/woff2" crossorigin>` for each font in the manifest and injects `@font-face` blocks with `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` so pre-swap and post-swap text occupy identical space (zero CLS)

## `defineConfig()`

Convenience wrapper that applies the base preset and merges additional options:

```ts
import { defineConfig } from "@fcalell/vite";

export default defineConfig({
  fonts: customFonts,          // Override default font manifest
  plugins: [myPlugin()],       // Appended after base preset plugins
  server: { port: 4000 },      // Standard Vite options
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fonts` | `FontEntry[]` | `defaultFonts` from `@fcalell/ui/fonts-manifest` | Fonts to preload + apply CLS-prevention `@font-face` overrides. |
| `plugins` | `Plugin[]` | `[]` | Additional Vite plugins (appended after the built-ins). |

All other standard Vite config options are passed through.

## What moved to plugins

The following features previously in this package are now provided by plugins:

| Feature | Now in | Plugin |
|---------|--------|--------|
| File-based routing | `@fcalell/plugin-app/vite` | `app` |
| Virtual app entry + HTML | `@fcalell/plugin-app` | `app` |
| API proxy | `@fcalell/plugin-api` | `api` |
| Virtual API client | `@fcalell/plugin-api` | `api` |

Consumers never install `vite`, `vite-plugin-solid`, `@tailwindcss/vite`, or `tailwindcss` directly.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/vite` | `createBasePreset()`, `defineConfig()`, `VitePresetOptions`, `StackViteConfig` |

## License

MIT
