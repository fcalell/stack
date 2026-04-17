# @fcalell/plugin-solid

SolidJS framework plugin for the `@fcalell/stack` framework. Provides SolidJS compilation, file-based routing with typed route declarations, and app bootstrap. Re-exports `@fcalell/ui` runtime utilities so consumers import from a single source.

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

`plugin-vite` is auto-resolved as a dependency -- no need to list it.

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
import { createApp } from "@fcalell/plugin-solid/app";
import "./app.css";

createApp();
```

### 4. Use typed routes

```tsx
import { A, useNavigate, routes } from "@fcalell/plugin-solid/router";

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

## Events

| Event | Emitted by | Purpose |
|-------|------------|---------|
| `SolidConfigured` | `Generate` | Signals that route declarations have been generated. `plugin-solid-ui` depends on this. |

## Dependencies

`plugin-solid` depends on `plugin-vite` via `vite.events.ViteConfigured`. The CLI auto-resolves `plugin-vite` when `plugin-solid` is present.

## Lifecycle

### Init / Scaffold

Pushes layout and index page templates to `src/app/pages/`:

- `src/app/pages/_layout.tsx` -- bare layout (passes through children)
- `src/app/pages/index.tsx` -- minimal index page

Adds `@fcalell/plugin-solid` and `solid-js` as dependencies.

### Generate

Scans `src/app/pages/` for `.tsx` / `.jsx` files, builds the route tree, and generates `.stack/routes.d.ts` with typed route builder declarations. Emits the `SolidConfigured` event.

### Dev / Build

Injects `vite-plugin-solid` and the routes plugin into the `Dev.Configure` / `Build.Configure` payload. These are picked up by `plugin-vite` and written into `.stack/vite.config.ts`.

### Remove

Marks `src/app/` for deletion and removes `@fcalell/plugin-solid` and `solid-js` from dependencies.

## Re-exports from `@fcalell/ui`

The plugin re-exports `@fcalell/ui` runtime utilities so consumers use `@fcalell/plugin-solid/*` as their single import source:

| Subpath | Re-exports from |
|---------|----------------|
| `./app` | `createApp`, `CreateAppOptions` |
| `./router` | `A`, `Navigate`, `routes`, `useNavigate`, `useParams`, `useLocation`, `useSearchParams`, `useMatch`, `useResolvedPath`, `useIsRouting`, `useCurrentMatches` |
| `./meta` | `Title`, `Meta`, `Link`, `MetaProvider` |
| `./query` | `useQuery`, `useInfiniteQuery`, `useMutation`, `useQueryClient`, `combineQueries` |
| `./theme` | `useTheme` |
| `./cn` | `cn` |

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-solid` | `solid()`, `SolidOptions` |
| `@fcalell/plugin-solid/app` | `createApp()`, `CreateAppOptions` |
| `@fcalell/plugin-solid/router` | Typed `routes` builder + SolidJS Router primitives |
| `@fcalell/plugin-solid/meta` | `Title`, `Meta`, `Link`, `MetaProvider` |
| `@fcalell/plugin-solid/query` | `useQuery`, `useInfiniteQuery`, `useMutation`, `useQueryClient`, `combineQueries` |
| `@fcalell/plugin-solid/theme` | `useTheme()` |
| `@fcalell/plugin-solid/cn` | `cn()` class merging utility |
| `@fcalell/plugin-solid/node/vite-routes` | `routesPlugin()` -- Vite plugin for file-based routing (used internally) |

## License

MIT
