# Routes

The web app's routes are TanStack Router file routes in `src/app/routes/`: one file, one route.
The router reads the directory on its own; there is no route list to keep.

```
src/app/routes/
  __root.tsx            # the root route: wraps every route
  index.tsx             # /
  settings.tsx          # /settings
  projects/
    route.tsx           # wraps every /projects route
    index.tsx           # /projects
    $projectId.tsx      # /projects/:projectId
  _signed-in/
    route.tsx           # a pathless layout: wraps its children, adds no URL segment
    inbox.tsx           # /inbox
  (marketing)/
    pricing.tsx         # /pricing: a group only organizes files, no segment, no layout
  -components/
    project-card.tsx    # ignored by the router: code a route imports
```

| Name | Means |
| --- | --- |
| `__root.tsx` | The one root route. `stack init` writes it rendering `<Outlet />`; app-wide providers and the app's frame go here |
| `index.tsx` | The directory's own URL |
| `route.tsx` | The directory's layout: it renders `<Outlet />` where its children go |
| `$name` | A path parameter, read with `Route.useParams()` |
| `_name` | A pathless layout: its file or `route.tsx` wraps its children, and the URL skips it |
| `(name)` | A group: a directory for files alone, adding neither a segment nor a layout |
| `-name` | Ignored by the router: components, hooks and helpers that belong to a route sit beside it |

## A route file

Each file exports `Route`, made by `createFileRoute`. The path string is the generator's: it
fills a new empty file and rewrites the string when a file moves, so never edit it by hand.

```tsx
// src/app/routes/projects/$projectId.tsx
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$projectId")({ component: Project });

function Project() {
  const { projectId } = Route.useParams();
  return <Link to="/projects/$projectId" params={{ projectId }}>Permalink</Link>;
}
```

## Typed routes

`stack generate` writes the route tree to `.stack/routeTree.gen.ts`, and the dev server and the
build rewrite it as files change. `.stack/routes.d.ts` registers the router over it, so `Link`,
`useNavigate`, `redirect` and `Route.useParams` are typed: a path or parameter that no route
serves fails the type-check. After adding, moving or deleting a route file outside `stack dev`,
run `stack generate` before `pnpm check`.

## Rules

- Keep a route file to its route: the `Route` export and the components it renders. A component
  two routes share lives in the app's `ui/` or a `-components/` directory, never in another
  route file.
- An address no route serves needs no route of yours: with `reactUi()` the router draws its
  not-found page. A `$.tsx` catch-all or a route's `notFoundComponent` replaces it.
- With `reactUi()` and `auth()` in the config, an organization lives at `/<slug>`, so every
  route's first static segment (`settings`, `inbox`) is a slug auth refuses. Name a top-level
  route knowing it takes that word from every organization.

**Check:** `stack generate`, then `pnpm check` passes.
