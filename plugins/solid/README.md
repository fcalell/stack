# @fcalell/plugin-solid

SolidJS framework plugin for the `@fcalell/stack` framework. Provides SolidJS compilation, file-based routing with typed route declarations, and app bootstrap. Design-system components, app bootstrap, router primitives, and all consumer-facing runtime utilities live in `@fcalell/plugin-solid-ui`.

**Stack:** SolidJS + vite-plugin-solid + file-based router (all internal -- consumers don't import them)

## Install

```bash
pnpm add @fcalell/plugin-solid
```

Peer dependency: `solid-js ^1.9`.

## Usage

### 1. Add to config

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { solid } from "@fcalell/plugin-solid";

export default defineConfig({
  plugins: [
    solid(),
  ],
});
```

`plugin-vite` must be listed explicitly alongside `plugin-solid` (`stack init` adds it automatically when you pick `solid` in the picker; `stack add solid` does the same).

### 2. Create pages

Pages live in `src/app/pages/` and are file-based routes:

```
src/app/pages/
  _layout.tsx          # root layout (wraps all pages)
  index.tsx            # /
  about.tsx            # /about
  projects/
    index.tsx          # /projects
    [id].tsx           # /projects/:id
```

### 3. Bootstrap the app

```tsx
// src/app/entry.tsx
import { createApp } from "@fcalell/plugin-solid-ui/app";
import "./app.css";

createApp();
```

### 4. Use typed routes

```tsx
import { A, useNavigate, routes } from "@fcalell/plugin-solid-ui/router";

<A href={routes.projects.detail({ id: "123" })}>Open project</A>;

const navigate = useNavigate();
navigate(routes.projects.settings({ id: "123" }));
```

Missing or extra params are compile errors. Renaming a page file updates the builder, surfacing every stale call site.

## Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `routes` | `false \| { pagesDir?: string }` | `{ pagesDir: "src/app/pages" }` | File-based routing config. Set to `false` to disable. |

```ts
// Custom pages directory
solid({ routes: { pagesDir: "src/pages" } })

// Disable file-based routing
solid({ routes: false })
```

## Owned slots

| Slot | Kind | Purpose |
|------|------|---------|
| `solid.slots.providers` | `list<ProviderSpec>` | JSX wrappers / siblings composed into `.stack/virtual-providers.tsx` (sorted by `order`) |
| `solid.slots.entryImports` | `list<TsImportSpec>` | Imports for `.stack/entry.tsx` |
| `solid.slots.mountExpression` | `value<TsExpression \| null>` | Root render call (override-able for custom mount) |
| `solid.slots.htmlShell` | `value<URL \| null>` | HTML shell template URL (override-able) |
| `solid.slots.htmlHead` | `list<HtmlInjection>` | `<head>` injections |
| `solid.slots.htmlBodyEnd` | `list<HtmlInjection>` | End-of-body injections |
| `solid.slots.routesPagesDir` | `derived<string \| null>` | Resolved pages directory (null when routing disabled) |
| `solid.slots.entrySource` | `derived<string \| null>` | Final `.stack/entry.tsx` source |
| `solid.slots.htmlSource` | `derived<string \| null>` | Final `.stack/index.html` source |
| `solid.slots.providersSource` | `derived<string \| null>` | Final `.stack/virtual-providers.tsx` source |
| `solid.slots.routesDtsSource` | `derived<string \| null>` | Final `.stack/routes.d.ts` source |
| `solid.slots.homeScaffold` | `value<ScaffoldSpec>` (`override`) | Home-page scaffold; `plugin-solid-ui` overrides it cleanly |

## Dependencies

`plugin-solid` requires `plugin-vite` (`requires: ["vite"]`). Both must be listed in `stack.config.ts`. The slot graph derives execution order from data flow — `plugin-solid` contributes to `vite.slots.configImports` / `pluginCalls`, so its contributions are resolved naturally before `vite.slots.viteConfig` is composed.

## Lifecycle contributions

### Init / Scaffold

Templates contributed via `cliSlots.initScaffolds`:

- `src/app/pages/_layout.tsx` (bare pass-through layout)
- `src/app/pages/index.tsx` via `solid.slots.homeScaffold` (the design-system version from `plugin-solid-ui` overrides this when present)

Auto-wires `@fcalell/plugin-solid` and `solid-js` into `cliSlots.initDeps`.

### Generate

Resolves `routesPagesDir` from options. When routing is enabled, `solid.slots.routesDtsSource` scans the pages directory and produces typed route declarations (graceful empty stub when the directory is missing — fresh-project safe). The four `*Source` derived slots compose `.stack/entry.tsx`, `.stack/index.html`, `.stack/virtual-providers.tsx`, and `.stack/routes.d.ts`; thin `cliSlots.artifactFiles` contributions write each.

### Dev / Build

Contributes `vite-plugin-solid` and the file-based-routing Vite plugin to `vite.slots.configImports` + `vite.slots.pluginCalls`. `plugin-vite` composes them into `.stack/vite.config.ts` and runs the dev/build processes — no coordination needed between the two plugins.

### Remove

Contributes `src/app/` to `cliSlots.removeFiles` and removes `@fcalell/plugin-solid` + `solid-js` from `package.json`.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-solid` | `solid()`, `SolidOptions` |
| `@fcalell/plugin-solid/node/vite-routes` | `routesPlugin()` -- Vite plugin for file-based routing (used internally) |

Consumer-facing runtime utilities (`createApp`, router primitives, meta, query, theme, `cn`, components) live in [`@fcalell/plugin-solid-ui`](../solid-ui).

## License

MIT
