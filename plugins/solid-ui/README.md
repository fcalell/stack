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

`plugin-solid` (and transitively `plugin-vite`) are auto-resolved as dependencies.

### Import components

```tsx
import { Button } from "@fcalell/plugin-solid-ui/components/button";
import { Card } from "@fcalell/plugin-solid-ui/components/card";
import { Form } from "@fcalell/plugin-solid-ui/components/form";
```


## How it works

`plugin-solid-ui` registers after `plugin-solid` via `solid.events.SolidConfigured`. Its scaffold templates override the bare ones from `plugin-solid` (last writer wins); its codegen wires up the design-system CSS import, font tokens, and the `MetaProvider` / `Toaster` composition.

### Template override

| Path | `plugin-solid` template | `plugin-solid-ui` template |
|------|------------------------|---------------------------|
| `src/app/pages/_layout.tsx` | Bare pass-through layout | Layout with `<Toaster />` |
| `src/app/pages/index.tsx` | Plain `<h1>Welcome</h1>` | `Card` with `Card.Title` + `Card.Description` |

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

## Lifecycle

### Init / Scaffold

Pushes `src/app/pages/index.tsx` — a UI-rich home page using `Card` and `Text` components. Overrides the bare template from `plugin-solid`.

### Generate

Contributes `themeFontsPlugin(fonts)` from `@fcalell/plugin-solid-ui/node/fonts` to `plugin-vite`'s `vite.events.ViteConfig`. Owns `solidUi.events.AppCss` and pushes `@fcalell/plugin-solid-ui/globals.css` into it, emitting a `--ui-font-*` CSS layer for each role-bound font. Adds `MetaProvider` + `Toaster` to `solid.events.Providers`.

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
