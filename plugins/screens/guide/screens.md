# The screens workbench

The workbench draws every route of the web app, one screen per route, in each state its queries
can take, from fixtures and with no backend running. Open it while designing or changing any
screen, and again before calling the screen done: a screen is done when all five states look
right. The app writes no story, harness or workbench config; a new route is a new screen on its own.

```bash
stack add screens   # once: installs the workbench and its packages into the app
stack screens dev   # serves the workbench (--port 6006)
stack screens test  # checks the screens a changed file reaches (--changed <ref>: since a ref; --all: every screen)
```

## The states

Each route has five states: **data**, **loading**, **error**, **empty** and **not found**. The
toolbar sets the mode (light, dark) and the density (desktop, touch) for the screen in view.
Draw each state in the screen itself (the screen recipe,
`node_modules/@fcalell/ui-core/guide/screen.md`); the workbench only reaches them.

A forced state applies to every query the route makes. A mutation always answers from its
fixture, whatever the state.

| State | What the screen's queries get |
| --- | --- |
| data | The fixture's value |
| loading | No answer, ever |
| error | A server error |
| empty | The fixture's value with no items: an array becomes `[]`, a `{ data, nextCursor }` page keeps its envelope with no rows, and a record has no empty form (it answers as it is) |
| not found | A `NOT_FOUND` error, which `isNotFound(error)` from `@fcalell/plugin-api/client` tests |

## Fixtures

All fixtures live in `src/app/fixtures.ts`: one per procedure, shared by every screen that calls
it, typed by the router, so a fixture that departs from its procedure's output fails
`pnpm check`. The second argument gives an example value for each route `$param`, by name.

```ts
// src/app/fixtures.ts
import { defineFixtures } from "@fcalell/plugin-screens/fixtures";
import type { AppRouter } from "../../.stack/worker";

export default defineFixtures<AppRouter>(
  {
    projects: {
      list: () => [{ id: "acme-web", name: "acme-web", status: "Live" }],
      get: ({ projectId }) => ({ id: projectId, name: projectId, status: "Live" }),
    },
  },
  { projectId: "acme-web" },
);
```

- A procedure with no fixture answers `no fixture for projects.get` and never reaches the
  network; add the fixture.
- A route whose `$param` has no example value fails its story, naming the param.
- A fixture takes the procedure's input and returns its output; give it a value for every state
  the screen draws, not only the happy one.
- A plugin supplies the fixtures of the endpoints it owns: with `auth`, every screen sees a
  signed-in session, so the app writes fixtures for its own procedures only.

## Routes

A route renders as it does in the app, so a parent route (a layout, `route.tsx`) draws its
children through `<Outlet />`; without it a screen under the parent shows an empty frame.

## The test run

`stack screens test` fails a screen with an axe violation (every rule, the page-level ones and
`target-size` included), a horizontal overflow at 320, 390, 768, 1280 or 1440 px, or a console error
or warning, naming the screen, state and mode. It runs the
screens a file with uncommitted changes reaches; `--changed <ref>` runs those a file changed since
that git ref reaches (a batch committed in a worktree runs `--changed master`), and `--all` runs
every one. A change under the `src/` of a workspace package the app links, outside the
directories its source exports serve, reruns every screen: it reaches no screen's module graph.

## Limits

- `target-size` is axe's WCAG 2.2 rule, the rubric's target floor: a target under 24 px fails
  only when a 24 px circle on it meets another target, so a lone small control passes. The 44 px
  primary act on touch is judged, since the run is at desktop density.
- Queries must come from `createApiQueryUtils` (`node_modules/@fcalell/plugin-api/guide/client.md`).
  Query utils built directly with oRPC's `createTanstackQueryUtils` send queries as `POST`, so a
  forced state never reaches them.
- An open non-modal popup (a Menu, a Select, a Screen's more menu) draws Base UI's focus guards,
  focusable `aria-hidden` spans axe's `aria-hidden-focus` flags, so the floors' axe run excludes
  `[data-base-ui-focus-guard]`; the exclusion goes once a Base UI release ships guards that are
  not focusable or not hidden.
- The session is one fixed signed-in user with no app-specific session fields, and there is no
  signed-out state.

**Check:** `stack screens dev` lists the new route with its five states, each drawing as
designed, and `stack screens test` and `pnpm check` pass.
