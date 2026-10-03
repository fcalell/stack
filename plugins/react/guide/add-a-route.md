# Add a route

A new URL in the web app is one file in `src/app/routes/`, the data it reads, and the screen it
renders. Work the steps in order; each names the page it needs and ends with its check.

## 1. Place the file

Decide the URL, its parameters and the layout that wraps it, then pick the file that serves it:
a directory's `index.tsx` for the directory's own URL, `$name` for a parameter, a `_name`
directory for a layout that adds no segment. Page: [routes](./routes.md), its naming table.

**Check:** you can write the file's path and the URL it serves.

## 2. Create it

Create the file empty while `pnpm dev` runs, and the router fills in its `createFileRoute` call
with the right path; outside dev, write the `Route` export yourself and run `stack generate`.
Page: [routes](./routes.md).

```tsx
// src/app/routes/projects/$projectId.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$projectId")({ component: Project });

function Project() {
  const { projectId } = Route.useParams();
  return null; // the screen, step 4
}
```

**Check:** `stack generate`, then `pnpm check` passes, and the URL renders under `pnpm dev`.

## 3. Read its data

Read what the screen shows through the typed client as a query, keyed by the route's parameters.
A procedure the route needs that does not exist yet is added first, by the add-a-procedure
recipe (`node_modules/@fcalell/plugin-api/guide/add-a-procedure.md`). Page:
`node_modules/@fcalell/plugin-api/guide/client.md`.

```tsx
const project = useQuery(orpc.projects.get.queryOptions({ input: { projectId } }));
```

**Check:** `pnpm check` passes, and the data arrives under `pnpm dev`.

## 4. Compose the screen

Compose the route's component from the roster, with every state the data can be in, then have it
judged. Page: the screen recipe, `node_modules/@fcalell/ui-core/guide/screen.md`.

**Check:** the screen recipe's sign-off.

## 5. Link to it

Reach the route from where the user starts: a `Link` or a `navigate` with its typed path and
params. Page: [routes](./routes.md), typed routes.

```tsx
<Link to="/projects/$projectId" params={{ projectId: project.id }}>{project.name}</Link>
```

**Check:** `pnpm check` passes, and the link opens the route under `pnpm dev`.
