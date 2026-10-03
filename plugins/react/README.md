# @fcalell/plugin-react

React framework plugin for the `@fcalell/stack` framework: React on Vite with the React Compiler, TanStack Router file-based routing with typed routes, the app bootstrap, the providers module, and the HTML shell with its `<head>` metadata. Design-system components live in a UI plugin.

**Stack:** React 19 + `@vitejs/plugin-react` + `babel-plugin-react-compiler` + TanStack Router (`@tanstack/react-router`, `@tanstack/router-plugin`)

## Install

```bash
pnpm add @fcalell/plugin-react
```

The consumer declares `react`, `react-dom`, `@types/react` and `@types/react-dom` (`stack init` writes them), `@tanstack/react-router` (the plugin's `dependencies`), and `@vitejs/plugin-react`, `@tanstack/router-plugin` and `babel-plugin-react-compiler` (its `devDependencies`), since the generated vite config imports them and Babel resolves the compiler from the consumer.

## Guide

Building the web app lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`web-app.md`](./guide/web-app.md), the `react()` and `vite()` options, the dev server and its
API proxy, and the files the app owns; [`routes.md`](./guide/routes.md), the file-route
conventions and typed routes; and [`add-a-route.md`](./guide/add-a-route.md), the recipe.

## Generated files

| File | Slot | Content |
|------|------|---------|
| `.stack/entry.tsx` | `react.slots.entrySource` | `createRouter({ routeTree })` mounted as `<StrictMode><Providers><RouterProvider /></Providers></StrictMode>` |
| `.stack/index.html` | `react.slots.htmlSource` | The shell with the `<head>` injections and the entry script |
| `.stack/virtual-providers.tsx` | `react.slots.providersSource` | The contributed providers, served as `virtual:stack-providers` |
| `.stack/routes.d.ts` | `react.slots.routesDtsSource` | The router's `Register` declaration |
| `.stack/routeTree.gen.ts` | `cliSlots.postWrite` | TanStack Router's route tree |

`.stack/vite.config.ts` gains `tanstackRouter()` ahead of `react()` (with the React Compiler), and `resolve.dedupe` for `react` and `react-dom`. `routes: false` turns file routing off: no route tree, no `routes.d.ts`, and no mount until a peer contributes one to `react.slots.mountExpression`.

## Slots

Peers contribute providers, entry imports, `<head>` and end-of-body tags, replace the mount, the shell or the home scaffold, and read `topLevelRoutes`. The table lives in [`slot-catalog.md`](../../.helm/knowledge/architecture/slot-catalog.md).

## License

MIT
