# Phone routes

The phone app's screens are expo-router files under `src/app/` (or `expo({ routes: { appDir } })`).
Each file's default export is the screen at its path. The generated entry, `.stack/entry.tsx`,
mounts expo-router over that directory inside every provider the plugins contribute, so the app
writes no `App` component and calls no `registerRootComponent`.

| File | Route |
| --- | --- |
| `src/app/_layout.tsx` | Wraps every route: the root layout |
| `src/app/index.tsx` | `/` |
| `src/app/projects/index.tsx` | `/projects` |
| `src/app/projects/[id].tsx` | `/projects/<id>`, the segment read with `useLocalSearchParams<{ id: string }>()` |
| `src/app/projects/_layout.tsx` | Wraps the routes under `/projects` |

## The root layout

The root layout draws the `Shell` around the current route. Its `places` are the tab bar: past
five, four tabs and a More tab listing the rest.

```tsx
// src/app/_layout.tsx
import { Shell } from "@fcalell/plugin-native-ui/components/shell";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { Slot } from "expo-router";

const places: PlaceSpec[] = [
  { route: "/", label: "Home", icon: "House" },
  { route: "/projects", label: "Projects", icon: "Folder" },
];

export default function Layout() {
  return (
    <Shell places={places}>
      <Slot />
    </Shell>
  );
}
```

A place is current at its route and every route under it; `/` only at itself.

## An address no route serves

With `nativeUi()`, `stack generate` writes `src/app/+not-found.tsx` when the directory holds no
`+not-found` file: the page for an unmatched address, drawn inside the root layout. It is yours
from then on: replace its contents to draw another page, and it is never rewritten.

## Places and panes

A route a tab opens renders a `Place` holding its `Pane`; the `Place` draws the tab bar under it. A
route pushed over it (a record, a form) renders its `Pane` alone, with no `Place`, its `back` the
route it returns to: the stack animates the push and covers the tab bar while it stands. `cover`
and `wide` change nothing on the phone.

```tsx
// src/app/projects/[id].tsx
export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery(orpc.projects.get.queryOptions({ input: { id } }));
  return (
    <Pane title={query.data?.name ?? "Project"} back="/projects">
      <QueryBoundary
        query={query}
        sentence="The project could not load."
        loading={<ItemHeader loading />}
      >
        {(project) => <ItemHeader overline={[project.team]} facts={[project.owner]} />}
      </QueryBoundary>
    </Pane>
  );
}
```

## Navigating

A roster `href`, `back` or place `route` navigates through expo-router on its own. App code
navigates with `router` or `Link` from `expo-router`. Every one of these routes is typed: `stack generate`
writes the route types from the files under the routes directory, and `stack dev` rewrites them
as a route file comes or goes, so an `href` to a path no file serves fails the type-check.

```tsx
<Link href="/projects/12">Project 12</Link> // a route file serves it
<Link href="/settings">Settings</Link> // fails the type-check: no route file
<Pane title="Settings" back="/setings" /> // fails the type-check too
```
