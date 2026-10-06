---
id: 007-01
status: backlog
sessions: {}
---
# stack: serve every route of a consumer app in each query state

## Goal
A consumer runs one stack command and browses every screen of its web app: each route, drawn in
each state its queries can take (data, loading, error, empty, not found), in light and dark, at
either density, with no backend running and no story, fixture harness or Storybook config written
by the consumer.

## Approach
- Routes: one screen per route of the app's TanStack file routes (`react`'s `routesDir`), so a
  new route is a new screen with nothing else to do.
- Data: each oRPC procedure a screen calls answers from a fixture typed by the app's router
  (`plugin-api`), so a fixture that drifts from its procedure fails the type-check. A screen
  without a fixture for a procedure it calls shows that gap, never a network call.
- States: forcing a query's state lives at the query layer (`plugin-api`'s query client), the way
  the showcase's `useFixture` forces `&query=`, so every route gets its loading, error, empty and
  not-found forms for free.
- Host: Storybook on the app's own Vite configuration, derived from the same `vite.slots` the
  app's config renders from, so a story renders a route through the app's real router (memory
  history at the route's URL) with the app's plugins. The adaptations the showcase's
  `apps/showcase/.storybook/stack-vite.ts` makes by hand (no frame-blocking headers, the root at
  the app rather than `.stack/`, the dependency optimizer started in middleware mode) come from
  the derivation instead; the showcase's roster Storybook, which renders no route, then uses it
  without the router plugin. Stories regenerate from the route list without a restart, as the roster's do.
- A guide page says when to open the workbench and how a screen's states are reached.

## Acceptance criteria
- [ ] In a consumer with routes and procedures, the command serves one screen per route, each in
  data, loading, error, empty and not-found, light and dark, at desktop and touch.
- [ ] A fixture whose shape departs from its procedure's output fails `pnpm check`.
- [ ] A route added while the command runs appears without a restart.
- [ ] The consumer's repo holds no Storybook config, story or harness file of its own.
- [ ] The showcase's Storybook derives its config the same way, and `stack-vite.ts` holds nothing
  the slots now contribute.
- [ ] The guide index lists the new page with its load trigger.

Decided by fcalell (2026-10-06):

- The commands belong to a `screens` plugin (`stack add screens`; `stack screens dev`,
  `stack screens test`), which requires react and api, installs Storybook and its addons itself,
  and contributes its Vite adaptations through the slot graph.
- A story answers `/rpc/<procedure>` in its own page (MSW through Storybook, per story, so
  parallel test pages share no state), in oRPC's wire format, from the fixtures. A forced state is
  an answer: one that never resolves (loading), a 500 (error), stack's `NOT_FOUND` (not found), a
  collection with no items (empty).
- The fixtures are one file, `src/app/fixtures.ts`, by procedure:
  `defineFixtures<AppRouter>({ projects: { list: (input) => [...] } })`, typed by the router and
  shared by every screen that calls the procedure, with an example value for each route `$param`.
  A plugin contributes the fixtures of its own endpoints (plugin-auth a signed-in session), so the
  consumer writes only its own procedures'.
- The showcase is the first consumer: its `/layout` places become real routes calling typed
  procedures, answered by `src/app/fixtures.ts`, and the screens workbench replaces both the page
  stories and the hand-built fake data (`useFixture`, `&query=`, `LayoutPage`).
- The two risks (MSW answering oRPC's wire format from typed fixtures; a Storybook config derived
  from vite's slots rendering a real route) are spiked before the plugin is built.

Decided after the spike (2026-10-06):

- plugin-vite exports the pure function that renders a Vite config from its slot values
  (`@fcalell/plugin-vite/node`); screens owns a derived slot that reads vite's input slots, blanks
  `clientHeaders`, adds its host-only plugin calls (the dependency optimizer started in Storybook's
  middleware mode, MSW's worker served from its package) and writes
  `.stack/screens.vite.config.ts`. A contribution to `vite.slots.pluginCalls` would reach the app's
  own config, so host-only calls never go there.
- plugin-react hands the router plugin absolute paths, so a host that moves Vite's `root` keeps
  the routes (`ENOENT …/src/app/routes` otherwise).
- No story file is written: Storybook's `stories` glob matches the route files and a custom
  indexer turns each route into its state stories as virtual CSF modules, so a route edit
  re-indexes on its own. If the Vitest addon needs real files, a gitignored non-dot folder at the
  app root takes them (Storybook's watcher ignores dot-directories).
- A forced state applies to every query the route makes, as the showcase's `&query=` does and a
  page's `QueryBoundary` draws it; a mutation always answers from its fixture.
- The answers use oRPC 1.14's server codec (`StandardRPCCodec` over `StandardRPCSerializer`,
  `toFetchResponse`); a forced not found is `ORPCError("NOT_FOUND")` (404), an error
  `INTERNAL_SERVER_ERROR`; empty is derived from the fixture's value (an array → `[]`, a
  `{ data, nextCursor }` page → no items, a record has no empty form). A procedure without a
  fixture answers `no fixture for <path>`, never the network.
- A parent route renders its children through `<Outlet/>`; the guide page says so.

## Open questions
- [x] The command's home.
- [x] Where a consumer's fixtures live and how one is named per procedure.
