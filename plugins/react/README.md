# @fcalell/plugin-react

React framework plugin for the `@fcalell/stack` framework: React on Vite with the React Compiler, TanStack Router file-based routing with typed routes, the app bootstrap, the providers module, and the HTML shell with its `<head>` metadata. Design-system components live in a UI plugin.

**Stack:** React 19 + `@vitejs/plugin-react` + `babel-plugin-react-compiler` + TanStack Router (`@tanstack/react-router`, `@tanstack/router-plugin`)

## Install

```bash
pnpm add @fcalell/plugin-react
```

The consumer declares `react`, `react-dom`, `@types/react` and `@types/react-dom` (`stack init` writes them), `@tanstack/react-router` (the plugin's `dependencies`), and `@vitejs/plugin-react`, `@tanstack/router-plugin` and `babel-plugin-react-compiler` (its `devDependencies`), since the generated vite config imports them and Babel resolves the compiler from the consumer.

## Usage

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { vite } from "@fcalell/plugin-vite";
import { react } from "@fcalell/plugin-react";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [vite(), react({ description: "My app" })],
});
```

`plugin-react` requires `plugin-vite`; both appear in the config.

### Routes

Routes follow TanStack Router's file convention under `src/app/routes/`:

```
src/app/routes/
  __root.tsx           # wraps every route
  index.tsx            # /
  about.tsx            # /about
  projects/
    route.tsx          # wraps /projects/*
    index.tsx          # /projects
    $id.tsx            # /projects/:id
  _auth/               # pathless layout: no URL segment
    login.tsx          # /login
  -components/         # ignored by the router
```

```tsx
// src/app/routes/projects/$id.tsx
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$id")({ component: Project });

function Project() {
  const { id } = Route.useParams();
  return <Link to="/projects/$id" params={{ id }}>Project {id}</Link>;
}
```

TanStack's generator writes the route tree to `.stack/routeTree.gen.ts`, on `stack generate` and from its Vite plugin in dev and build. `.stack/routes.d.ts` registers the router over it, so `Link`, `useNavigate` and `Route.useParams` are typed and a stale path is a compile error.

## Options

| Option | Default | Purpose |
|--------|---------|---------|
| `routes` | `{ dir: "src/app/routes" }` | The routes directory, relative to the project root; `false` turns file routing off (a peer then contributes the mount) |
| `title` | `app.name` | `<title>` |
| `description` | none | `<meta name="description">` |
| `icon` | none | `<link rel="icon">` |
| `themeColor` | none | `<meta name="theme-color">` |
| `lang` | `"en"` | `<html lang>` |

## Generated files

| File | Slot | Content |
|------|------|---------|
| `.stack/entry.tsx` | `react.slots.entrySource` | `createRouter({ routeTree })` mounted as `<StrictMode><Providers><RouterProvider /></Providers></StrictMode>` |
| `.stack/index.html` | `react.slots.htmlSource` | The shell with the `<head>` injections and the entry script |
| `.stack/virtual-providers.tsx` | `react.slots.providersSource` | The contributed providers, served as `virtual:stack-providers` |
| `.stack/routes.d.ts` | `react.slots.routesDtsSource` | The router's `Register` declaration |
| `.stack/routeTree.gen.ts` | `cliSlots.postWrite` | TanStack Router's route tree |

`.stack/vite.config.ts` gains `tanstackRouter()` ahead of `react()` (with the React Compiler), and `resolve.dedupe` for `react` and `react-dom`.

## Slots

Peers contribute providers, entry imports, `<head>` and end-of-body tags, replace the mount, the shell or the home scaffold, and read `topLevelRoutes`. The table lives in [`slot-catalog.md`](../../.helm/knowledge/architecture/slot-catalog.md).

## License

MIT
