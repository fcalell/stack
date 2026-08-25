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

Every component's props close `class`, `style`, and `classList` as `?: never`, per the canon in
`@fcalell/ui-core` (law 5): a look the matrices do not cover has two homes, the matrix grows or the
consumer authors its own primitive under `ui/`. There is no renamed hatch either; the old
`contentClass` / `listClass` / `containerClass` props are gone. The rhythm family
(`components/stack`, `components/row`, `components/pair`, and `Section`'s rung) lays out siblings
at the shared spacing rungs.

### Record-scoped abilities

`useAbility` (`@fcalell/plugin-solid-ui/lib/ability`) is the solid analog of `@fcalell/plugin-api/tanstack-query`'s `useAbility` -- same deny-all-until-loaded, org ∪ record composition, memoized `MongoAbility` (full behavior in the `@fcalell/plugin-api` README). Solid-style: both the record-rules argument and the return value are accessors.

```tsx
import { useAbility } from "@fcalell/plugin-solid-ui/lib/ability";

function DeleteOrgButton() {
  const ability = useAbility();
  return <Show when={ability().can("delete", "organization")}><Button>Delete</Button></Show>;
}
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
| `theme` | `Theme` | the calibrated defaults | The design contract: `knobs` (six hues plus a neutral-chroma scalar), `overrides.colors` / `overrides.scales` for anything the knobs don't reach, and `defaultMode`. Every value resolves through `deriveTheme` and lands in the `@theme` block of `.stack/app.css`. |

### `theme`

The schema rejects an unknown token name, a color outside the `oklch(L C H)` shape, and a scale
value that would break out of its declaration, naming the offending key. `defaultMode` picks which
palette seeds a native sheet; the web runtime resolves the mode from `localStorage` then
`prefers-color-scheme`, so on this plugin it is inert and the `@theme` block always seeds light.

```ts
import { solidUi } from "@fcalell/plugin-solid-ui";

solidUi({
  theme: {
    knobs: { brandHue: 120, neutralChroma: 0 },
    overrides: { scales: { "--radius-control": "8px" } },
  },
});
```

`Theme` is re-exported from `@fcalell/plugin-solid-ui`. The type and the derivation both live in
`@fcalell/ui-core`, which this plugin renders its stylesheet from.

### `fonts`

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
| `solidUi.slots.appCssBlocks` | `list<CssBlock>` | Top-level `@theme` / `@utility` blocks |
| `solidUi.slots.appCssLayers` | `list<{ name, content }>` | CSS `@layer` blocks |
| `solidUi.slots.fonts` | `derived<FontEntry[]>` | Resolved fonts (consumer options or `defaultFonts`) |
| `solidUi.slots.resolvedTheme` | `derived<ResolvedTheme>` | The `theme` option through ui-core's `deriveTheme`, resolved once |
| `solidUi.slots.appCssSource` | `derived<string \| null>` | Final `.stack/app.css` source |

## Slot contributions

| Target slot | Behavior |
|-------------|----------|
| `vite.slots.configImports` + `pluginCalls` | Tailwind v4 plugin and `themeFontsPlugin(fonts)` |
| `solid.slots.providers` | `MetaProvider` (wrap, `order: 0`) + `Toaster` (sibling) |
| `solid.slots.homeScaffold` (override) | Design-system home page (`Card` + `Card.Title` + `Card.Description`) |
| `cliSlots.artifactFiles` | Writes `.stack/app.css` from `solidUi.slots.appCssSource` |
| `cliSlots.buildSteps` | `solid-ui-geometry-gate`, the pre-phase geometry gate |

The `solid-ui-geometry-gate` build step runs before the Vite build on every `stack build`. It
scans the consumer's `src/` tree (skipping any path with a `ui/` segment) with the web host rule
and fails the build on any class outside the closed geometry vocabulary, or on a class attribute
riding a non-intrinsic tag. The vocabulary, the host rule, and the coverage statement live in the
`@fcalell/ui-core` README.

### Remove

Nothing to tear down: the design-system runtime lives inside this package and is removed from `package.json` when the plugin is uninstalled. `src/app/` is owned by `plugin-solid`.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-solid-ui` | `solidUi()`, `SolidUiOptions`, `FontEntry` |
| `@fcalell/plugin-solid-ui/globals.css` | The parts of the sheet only the web owns: the component `@source`, the `dark` custom variant, the base layer, and the three keyframe blocks. The tokens come from `@fcalell/ui-core` through `.stack/app.css`, which imports `tailwindcss` before this file |
| `@fcalell/plugin-solid-ui/fonts` | JetBrains Mono Variable registration (side-effect import) |
| `@fcalell/plugin-solid-ui/node/fonts` | `FontEntry`, `defaultFonts`, `themeFontsPlugin()` (node-side Vite plugin) |
| `@fcalell/plugin-solid-ui/app` | `createApp()` — mounts the root tree with router, query, meta, toaster, error boundary |
| `@fcalell/plugin-solid-ui/meta` | `Title`, `Meta`, `Link`, `MetaProvider` — re-exported from `@solidjs/meta` |
| `@fcalell/plugin-solid-ui/router` | Typed `routes` builder + SolidJS Router primitives |
| `@fcalell/plugin-solid-ui/components/*` | Component modules (e.g. `components/button`, `components/form`, `components/stack`) |
| `@fcalell/plugin-solid-ui/lib/cn` | `cn()`, re-exported from `@fcalell/ui-core/cn`; its `tailwind-merge` knows the contract's five scales |
| `@fcalell/plugin-solid-ui/lib/query` | Safe `useQuery`/`useInfiniteQuery`, `useMutation`, `useQueryClient`, `combineQueries`, `createDefaultQueryClient` (auto-invalidating default, see `@fcalell/plugin-api` README) |
| `@fcalell/plugin-solid-ui/lib/ability` | `useAbility()` — accessor-style record-scoped authorization (see below), `ORG_RULES_QUERY_KEY` |
| `@fcalell/plugin-solid-ui/lib/theme` | `useTheme()` runtime light/dark toggle |

Component documentation lives in [`docs/`](docs/).

## License

MIT
