# @fcalell/plugin-solid-ui

SolidJS design system for the `@fcalell/stack` framework. Ships the full component library (Kobalte + Tailwind v4 + CVA) **and** the CLI plugin that wires it into a consumer's `stack dev` / `stack build` flow — scaffolded templates, CSS import, font preloading, and provider composition.

**Stack:** SolidJS + Kobalte + Tailwind v4 + CVA + `@tanstack/solid-query` + `@tanstack/solid-form` (all internal -- consumers import from this package's subpaths).

## Install

```bash
pnpm add @fcalell/plugin-solid-ui
```

Peer dependencies: `solid-js ^1.9`, `@tanstack/solid-form ^1.28` (optional).

## Usage

### Add to config

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [
    solid(),
    solidUi(),
  ],
});
```

`plugin-solid` and `plugin-vite` must be listed alongside `plugin-solid-ui` (`stack init` adds them automatically when you pick the design system).

### Import components

```tsx
import { Button } from "@fcalell/plugin-solid-ui/components/button";
import { Card } from "@fcalell/plugin-solid-ui/components/card";
import { Form } from "@fcalell/plugin-solid-ui/components/form";
```


## How it works

`plugin-solid-ui` contributes typed values into the slots `plugin-solid` and `plugin-vite` own. There is no event ordering — its `solid.slots.homeScaffold` contribution overrides solid's default home-page seed via the `override: true` semantic on the value slot, and its provider/CSS contributions land structurally during graph resolution.

### Template override

| Path | `plugin-solid` template | `plugin-solid-ui` override |
|------|-------------------------|---------------------------|
| `src/app/pages/index.tsx` | Plain `<h1>Welcome</h1>` (seed of `solid.slots.homeScaffold`) | `Card` with `Card.Title` + `Card.Description` (overrides the seed) |

## Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fonts` | `FontEntry[]` | `defaultFonts` (JetBrains Mono as `mono`) | Webfonts to preload. Each entry is preloaded, gets an `@font-face` (real + fallback metrics), and — when `role` is set — rebinds the matching `--ui-font-*` token. |

```ts
import { solidUi } from "@fcalell/plugin-solid-ui";

solidUi({
  fonts: [
    {
      family: "Inter Variable",
      specifier: "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
      role: "sans",
      fallback: {
        family: "sans-serif",
        ascentOverride: "90%",
        descentOverride: "22%",
        lineGapOverride: "0%",
        sizeAdjust: "107%",
      },
    },
  ],
});
```

`FontEntry` is re-exported from `@fcalell/plugin-solid-ui`. The type and the `themeFontsPlugin` that consumes it both live in `@fcalell/plugin-solid-ui/node/fonts`.

## Owned slots

| Slot | Kind | Purpose |
|------|------|---------|
| `solidUi.slots.appCssImports` | `list<string>` | CSS `@import`s for `.stack/app.css` |
| `solidUi.slots.appCssLayers` | `list<{ name, content }>` | CSS `@layer` blocks |
| `solidUi.slots.fonts` | `derived<FontEntry[]>` | Resolved fonts (consumer options or `defaultFonts`) |
| `solidUi.slots.appCssSource` | `derived<string \| null>` | Final `.stack/app.css` source |

## Slot contributions

| Target slot | Behavior |
|-------------|----------|
| `vite.slots.configImports` + `pluginCalls` | Tailwind v4 plugin and `themeFontsPlugin(fonts)` |
| `solid.slots.providers` | `MetaProvider` (wrap, `order: 0`) + `Toaster` (sibling) |
| `solid.slots.homeScaffold` (override) | Design-system home page (`Card` + `Card.Title` + `Card.Description`) |
| `cliSlots.artifactFiles` | Writes `.stack/app.css` from `solidUi.slots.appCssSource` |

### Remove

Nothing to tear down: the design-system runtime lives inside this package and is removed from `package.json` when the plugin is uninstalled. `src/app/` is owned by `plugin-solid`.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-solid-ui` | `solidUi()`, `SolidUiOptions`, `FontEntry` |
| `@fcalell/plugin-solid-ui/globals.css` | Token system, Tailwind theme, base styles, animations |
| `@fcalell/plugin-solid-ui/fonts` | JetBrains Mono Variable registration (side-effect import) |
| `@fcalell/plugin-solid-ui/node/fonts` | `FontEntry`, `defaultFonts`, `themeFontsPlugin()` (node-side Vite plugin) |
| `@fcalell/plugin-solid-ui/app` | `createApp()` — mounts the root tree with router, query, meta, toaster, error boundary |
| `@fcalell/plugin-solid-ui/meta` | `Title`, `Meta`, `Link`, `MetaProvider` — re-exported from `@solidjs/meta` |
| `@fcalell/plugin-solid-ui/router` | Typed `routes` builder + SolidJS Router primitives |
| `@fcalell/plugin-solid-ui/components/*` | Component modules (e.g. `components/button`, `components/form`) |
| `@fcalell/plugin-solid-ui/lib/cn` | `cn()` class merging utility |
| `@fcalell/plugin-solid-ui/lib/query` | Safe `useQuery`/`useInfiniteQuery`, `useMutation`, `useQueryClient`, `combineQueries` |
| `@fcalell/plugin-solid-ui/lib/theme` | `useTheme()` runtime light/dark toggle |

Component documentation lives in [`docs/`](docs/).

## License

MIT
