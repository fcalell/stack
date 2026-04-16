# @fcalell/plugin-app

Frontend plugin for the `@fcalell/stack` framework. Provides file-based routing for SolidJS, a Vite plugin for route scanning, and CLI hooks for scaffolding and dev. No worker contribution -- this is a frontend-only plugin.

## Install

```bash
pnpm add @fcalell/plugin-app
```

## Usage

### 1. Add to config

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/config";
import { app } from "@fcalell/plugin-app";

export default defineConfig({
  plugins: [
    app(),
  ],
});
```

The `app` plugin has no required dependencies -- it can be used standalone for frontend-only projects.

### 2. Create pages

Files in `src/app/pages/` map to URLs:

| File | Route | Notes |
|------|-------|-------|
| `pages/index.tsx` | `/` | |
| `pages/projects/index.tsx` | `/projects` | |
| `pages/projects/[id].tsx` | `/projects/:id` | Dynamic segment |
| `pages/projects/[id]/settings.tsx` | `/projects/:id/settings` | Nested dynamic |
| `pages/[...catchAll].tsx` | `/*catchAll` | Catch-all |
| `pages/_layout.tsx` | (wraps siblings) | Nested layout |
| `pages/_notFound.tsx` | 404 fallback | |
| `pages/(app)/_layout.tsx` | layout-only group | Folder name stripped from URL |

```tsx
// src/app/pages/_layout.tsx
import type { ParentProps } from "solid-js";

export default function RootLayout(props: ParentProps) {
  return <main>{props.children}</main>;
}
```

```tsx
// src/app/pages/index.tsx
export default function HomePage() {
  return <h1>Hello from @fcalell/stack</h1>;
}
```

### 3. Typed route builder

The plugin generates `.stack/routes.d.ts` with typed route builders. Use them via `@fcalell/ui/router` for refactor-safe link generation:

```tsx
import { A, routes } from "@fcalell/ui/router";

<A href={routes.projects.detail({ id: "123" })}>Open</A>
```

Dynamic segments accept `string | number` params. Static routes take no arguments.

### 4. Override points

| File | Effect |
|------|--------|
| `src/app/entry.tsx` | Custom app entry (providers, query client, etc.) |
| `src/app/app.css` | Custom CSS (theme tokens, global overrides) |

If these files don't exist, the framework auto-generates sensible defaults.

## Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `routes` | `false \| { pagesDir?: string }` | enabled, `pagesDir: "src/app/pages"` | File-based routing. Set `false` to disable. |
| `domain` | `string` | -- | App domain |

```ts
// Custom pages directory
app({ routes: { pagesDir: "src/pages" } })

// Disable file-based routing (provide routes manually)
app({ routes: false })
```

## File-based routing conventions

- **`index.tsx`** -- maps to the parent directory's path (`/`, `/projects`, etc.)
- **`_layout.tsx`** -- wraps sibling pages in a layout (does not add a URL segment)
- **`_notFound.tsx`** -- 404 catch-all (top-level only)
- **`[name].tsx`** -- dynamic segment (`:name`)
- **`[...name].tsx`** -- catch-all segment (`*name`)
- **`(group)/`** -- layout group folder (scopes a layout without adding a URL segment)

The route tree is emitted as `virtual:fcalell-routes`, consumed by `createApp()` from `@fcalell/ui/app`. Consumers don't import the virtual module directly.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-app` | `app()`, `AppOptions` |
| `@fcalell/plugin-app/vite` | `routesPlugin()` -- Vite plugin for route scanning |
| `@fcalell/plugin-app/cli` | CLI plugin (detect, scaffold, generate, dev hooks) |

## For plugin authors / maintainers

### Vite plugin

`routesPlugin(opts?)` from `@fcalell/plugin-app/vite` is a Vite plugin that:

1. On `configResolved`: scans `pagesDir` using fast-glob, builds the route tree, and emits the virtual module + `.stack/routes.d.ts`
2. Resolves `virtual:fcalell-routes` to the cached module content
3. On `configureServer`: watches the pages directory for file add/remove and rebuilds + invalidates the virtual module, triggering a full reload
4. On `handleHotUpdate`: forces a full reload when a `_layout.tsx` changes (re-nesting isn't HMR-safe)

### Route scanning logic (`routes-core.ts`)

**Key functions:**

| Function | Purpose |
|----------|---------|
| `parseSegment(raw)` | Classifies a path segment: static, dynamic (`:name`), catch-all (`*name`), or route group (empty) |
| `buildTree(files, absPagesDir)` | Converts a flat list of page files into a `RouteNode` tree, extracting layouts, index files, leaf files, and the 404 page |
| `emitRoutes(root, projectRoot, notFoundFile)` | Walks the tree and emits three strings: the route array (for SolidJS router), typed routes runtime (builder functions), and typed routes types (for `.d.ts`) |
| `emitVirtualModule(routesArray, typedRoutesRuntime)` | Wraps the route array and typed routes into a complete ES module using `import.meta.glob` for lazy loading |
| `emitDts(typedRoutesTypes)` | Generates the `virtual:fcalell-routes` type declaration |

**`RouteNode` structure:**

```ts
interface RouteNode {
  segment: string;       // URL segment (e.g., "projects", ":id", "*catchAll", "")
  paramName?: string;    // param name for dynamic/catch-all segments
  isCatchAll?: boolean;
  leafFile?: string;     // component file for this exact path
  indexFile?: string;    // index.tsx component
  layoutFile?: string;   // _layout.tsx wrapping children
  children: Map<string, RouteNode>;
}
```

### CLI plugin hooks

| Hook | Behavior |
|------|----------|
| `detect` | Checks if `"app"` is in the config's plugin list |
| `prompt` | No prompts (returns `{}`) |
| `scaffold` | Writes `src/app/pages/_layout.tsx` and `src/app/pages/index.tsx` templates, adds deps (`@fcalell/plugin-app`, `@fcalell/ui`, `solid-js`), gitignores `.stack` |
| `bindings` | No bindings (returns `[]`) |
| `generate` | Scans page files, builds the route tree, and emits `.stack/routes.d.ts` |
| `dev` | Starts the Vite dev server via `stack-vite dev` |
| `build` | Pre-build hook placeholder (routes plugin is applied via the Vite preset) |
| `deploy` | Builds the app and deploys via Cloudflare Pages |

### Worker contribution

None. The `app` plugin is frontend-only (`worker: undefined`).

## License

MIT
