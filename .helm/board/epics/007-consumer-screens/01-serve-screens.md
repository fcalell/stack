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
- Host: Storybook on the app's generated Vite config, its adaptations contributed through the
  slot graph (`react` drops the router plugin, `vite` the frame-blocking headers and the `.stack/`
  root), moving out of `apps/showcase/.storybook/stack-vite.ts`; the showcase then uses the same
  derivation. Stories regenerate from the route list without a restart, as the roster's do.
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

## Open questions
- [ ] The command's home: core stays domain-agnostic, so a plugin owns it as a subcommand
  (`stack <plugin> <command>`). Recommended: a `screens` plugin, so the commands read
  `stack screens dev` and `stack screens test`; or a subcommand of `react`.
- [ ] Where a consumer's fixtures live and how one is named per procedure.
