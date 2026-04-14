# @fcalell/vite

Vite preset for the `@fcalell/stack` framework. Pre-configures SolidJS, Tailwind v4, an API proxy, file-based routing, and theme/font FOUC prevention — consumers get a working build with zero config.

**Stack:** Vite + vite-plugin-solid + @tailwindcss/vite (all internal — consumers don't import them)

## Install

```bash
pnpm add @fcalell/vite
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from "@fcalell/vite";

export default defineConfig();
```

That's it. SolidJS compilation, Tailwind v4 processing, an API proxy to `localhost:8787`, file-based routing under `src/app/pages/`, and anti-FOUC theme + font preload injection are all configured automatically.

## Options

`defineConfig` accepts all standard Vite config options, plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiProxy` | `string \| false` | `"http://localhost:8787"` | Proxy target for `/rpc` requests. Set to `false` to disable. |
| `fonts` | `FontEntry[]` | `defaultFonts` from `@fcalell/ui/fonts-manifest` | Fonts to preload + apply CLS-prevention `@font-face` overrides. |
| `routes` | `false \| { pagesDir?: string }` | enabled, `pagesDir: "src/app/pages"` | File-based routing plugin. Set `false` to disable. |
| `plugins` | `Plugin[]` | `[]` | Additional Vite plugins (appended after the built-ins). |

```ts
// Custom proxy target
export default defineConfig({
  apiProxy: "http://localhost:9000",
});

// No API (app-only project)
export default defineConfig({
  apiProxy: false,
});

// Disable file-based routing (provide routes manually to createApp)
export default defineConfig({
  routes: false,
});

// Custom pages directory
export default defineConfig({
  routes: { pagesDir: "src/pages" },
});

// Additional plugins + standard Vite options
export default defineConfig({
  plugins: [myPlugin()],
  server: { port: 4000 },
});
```

## What it handles

- **SolidJS** — JSX compilation via `vite-plugin-solid`
- **Tailwind v4** — CSS processing via `@tailwindcss/vite`
- **API proxy** — `/rpc` requests proxied to the Cloudflare Worker dev server in development
- **Theme FOUC prevention** — synchronous anti-FOUC `<script>` injected into `<head>` that reads `localStorage.theme` (falling back to `prefers-color-scheme`) and toggles `.dark` on `<html>` before first paint
- **Font preload + CLS prevention** — emits `<link rel="preload" as="font" type="font/woff2" crossorigin>` for each font in the manifest and injects `@font-face` blocks with `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` so pre-swap and post-swap text occupy identical space (zero CLS)
- **File-based routing** — scans `src/app/pages/**` and emits the virtual module `virtual:fcalell-routes` (consumed automatically by `createApp()` from `@fcalell/ui/app`); also writes `.stack/routes.d.ts` for the typed `routes` builder exported by `@fcalell/ui/router`

Consumers never install `vite`, `vite-plugin-solid`, `@tailwindcss/vite`, `tailwindcss`, or `fast-glob` directly.

## File-based routing

Files in `src/app/pages/` map to URLs (SolidStart/SvelteKit conventions). Underscore prefixes mark framework files; `[name]` is a dynamic segment; `[...name]` is a catch-all; `(group)` folders scope a layout without adding a URL segment.

| File | Maps to | Notes |
|---|---|---|
| `pages/index.tsx` | `/` | |
| `pages/projects/index.tsx` | `/projects` | |
| `pages/projects/[id].tsx` | `/projects/:id` | Dynamic segment |
| `pages/projects/[id]/settings.tsx` | `/projects/:id/settings` | Nested dynamic |
| `pages/[...catchAll].tsx` | `/*catchAll` | Catch-all |
| `pages/_layout.tsx` | (wraps siblings) | Nested layout |
| `pages/_notFound.tsx` | 404 fallback | |
| `pages/(app)/_layout.tsx` | layout-only group | Folder name is stripped from the URL |

The plugin exposes the route tree as `import { routes } from "virtual:fcalell-routes"`. Consumers don't import the virtual module directly — `@fcalell/ui/app`'s `createApp()` consumes it for the runtime tree, and `@fcalell/ui/router` re-exports the typed `routes` builder for refactor-safe link generation:

```tsx
import { A, routes } from "@fcalell/ui/router";

<A href={routes.projects.detail({ id: "123" })}>Open</A>;
```

The watcher invalidates the virtual module on file add/remove and forces a full reload when a `_layout.tsx` changes (re-nesting isn't HMR-safe).

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/vite` | `defineConfig()`, `StackConfig` |

## License

MIT
