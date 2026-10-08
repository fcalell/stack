---
id: 003-85
status: done
sessions: {}
---
# plugin-react, plugin-expo: stack draws an unknown address itself

## Goal
Every consumer needs a page for an address nothing matches. Stead writes its own (`packages/server/src/app/routes/$.tsx`: a `Place` holding "Nothing is at this address." and an act to Now), and each Stack app would write the same, on the web and on the phone.

## Approach
Story 62 gives the app `Missing`, which it composes with a `Place` in its catch-all route. Stack can draw the page itself instead: plugin-react contributes TanStack Router's `defaultNotFoundComponent` through the router's not-found, and the Expo app gets a `+not-found` route, each drawing `Missing` with an act to the Shell's first place. That needs a react-ui to react slot, a title and a sentence word (`notFound`, `nowhere`) and phone routing, so it is cross-plugin and was cut from story 62.

## Acceptance criteria
- [x] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Decided while building (2026-10-07), by the building session

Shape: none of the four. There is no roster part, variant, token or option, and the app passes
nothing. The `notFound` and `nowhere` words already existed; the page is an internal component per
platform, `lib/not-found` in react-ui and native-ui, built from `Place`, `Missing`, `Gate` and `Link`.

- Web: react-ui contributes `bindNotFound` to `react.slots.routerBindings` (a `.tsx` module apart
  from the node-tested `navigate.ts`), which the default mount calls after `createRouter`:
  `router.update({ defaultNotFoundComponent })`. Verified against the installed router
  (@tanstack/react-router 1.170.40, router-core 1.171.33): `update` merges options (the
  constructor calls it itself), `RouterProvider` re-merges `router.options`, and the default is read
  at render. A route's own `notFoundComponent` and a catch-all route that matches win.
- Where a miss stands: `fuzzy` mode hands it to the nearest matched route with a `notFoundComponent`,
  else the deepest matched route with children, else the root. Run against a root, a pathless
  `_app` layout with `/members`, `/` and `/login`: `/nowhere` and `/a/b/c` match the root alone
  (outside the Shell), as does `/login/x` (a leaf outside the layout); `/members/zzz` matches
  `/_app/members`, a leaf with no children, so the miss stands in the layout (`/_app`, inside the
  Shell). A pathless layout cannot take a miss no route is under. So the page is
  frame-aware: the Shell hands `ShellHome` (a `LinkAct` to its first place that is a route, since a
  place like `#activity` leads nowhere from a missing address) to a `Place` holding `Missing`;
  without a Shell it is a `Gate` with the `back` word to `/`. The act's label is that place's own
  label, so no new word.
- Phone: expo-router draws an unmatched address from a `+not-found` file at the root of the routes
  directory and from no other place (installed expo-router 56.2.21; without one it draws its own
  "Unmatched Route"); `.stack/` is not read, and the require-context keys were left alone since a
  documented file route exists. So expo owns `notFoundRoute` (a module, null seeded) and
  `notFoundFile`, and generate writes `<routes dir>/+not-found.tsx`, a one-line re-export of the
  module native-ui contributes (`lib/not-found`), only while the root of the routes directory holds
  no `+not-found.*`: the app's own wins, and the generated one is the app's from then on (never
  rewritten). It stands inside the root layout, so a Shell there draws a `Place`.
- Tests: react-ui `graph.test.ts` (the binding in the entry, before render, absent without routes),
  expo `not-found.test.ts` (written only when absent, per extension, configured directory, no
  module, routes off), native-ui `entry.test.ts` (the contribution); the behaviour story
  `not-found.stories.tsx` drives a memory-history router at a root miss and a miss under the Shell.
  The story was not run in a browser by the building session.
