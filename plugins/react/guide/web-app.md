# The web app

`react()` makes the app's web client: React 19 with the React Compiler, built and served by
Vite, routed by the files in `src/app/routes/` (the [routes](./routes.md) page). `vite()` runs
the dev server and the build; `react()` requires it, so both sit in `stack.config.ts`. Stack
writes the HTML shell, the entry, the providers module and the Vite config under `.stack/`; the
app writes routes and the code they import.

```ts
// stack.config.ts
plugins: [
  vite(),
  react({ title: "Acme", description: "Projects for teams", icon: "/favicon.svg", themeColor: "#0b0b0f" }),
  reactUi(),
],
```

## `react()` options

| Option | Default | What it does |
| --- | --- | --- |
| `title` | `app.name` | The document's `<title>` |
| `description` | none | `<meta name="description">` |
| `icon` | none | `<link rel="icon">`: a URL, usually a file in `public/` (`"/favicon.svg"`) |
| `themeColor` | none | `<meta name="theme-color">` |
| `lang` | `"en"` | `<html lang>` |
| `routes` | `{ dir: "src/app/routes" }` | The routes directory, from the app's root |

The shell already sets the charset and a viewport with `viewport-fit=cover`; there is no
`index.html` to edit.

## `vite()` options

| Option | Default | What it does |
| --- | --- | --- |
| `port` | `3000` | The dev server's port; `http://localhost:<port>` is a dev origin the worker trusts unless `app.origins` is set |
| `restart` | `"never"` | Restart the dev server when it exits: `"on-crash"` or `"always"` |
| `maxRestarts` | `3` | How many restarts `restart` allows |

A taken port stops the dev server with a message naming `vite({ port })`.

## Dev

`stack dev` serves the app at `http://localhost:<port>` with hot reload. The dev server proxies
every path the worker owns (the API's `/rpc`, auth's `/api/auth`, and `/ws` on the node target)
to the worker's dev process, so the browser reaches the API on the page's own origin, exactly as
in production. The API client and the auth client therefore take no `baseURL` and no absolute
`url`: their defaults are relative, and the session cookie is first-party.

## Files the app owns

- `src/app/`: the routes and every module the web app imports. `#src/` in an import is `src/`,
  extension included (`import { orpc } from "#src/app/lib/api.ts"`), through the `imports` field
  `stack init` writes.
- `public/`: static files served as they are at `/` (`public/favicon.svg` is `/favicon.svg`).
- `stack build` writes the built client to `dist/client/`; never edit it.

## Rules

- Write no `useMemo`, `useCallback` or `React.memo` for speed: the React Compiler memoizes
  every component and hook. Follow the Rules of React, which the compiler relies on.
- Never write a Vite config, an `index.html` or an entry file: they are generated, and a change
  to them is an option on `react()`, `vite()` or a gap
  (`node_modules/@fcalell/cli/guide/gap.md`).

**Check:** `stack generate`, then `pnpm check` passes, and the page loads under `pnpm dev`.
