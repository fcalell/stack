---
id: 003-61
status: backlog
sessions: {}
---
# react-ui: a link or an act opens a route without a document load

## Goal
Stead's web app (github.com/fcalell/stead, `packages/server/src/app`, step 5b) keeps live state in the page: one WebSocket with a thread's presence watch, a reply streaming in, an urgent arrival held for the shell's banner, drafts in fields. `design/07-interface.md`, "Stead's usage", requires that reads redraw in place, that nothing reloads, and that Retry keeps every draft. Every `Shell` place, `ListRow` `href`, `Screen` `back`, `Link` and a missing read's Back in react-ui is a plain `<a href>`, and `lib/navigate.ts`'s `navigate()` is `location.assign`, so each tap reloads the document: the `Split`'s list remounts, the socket reopens, presence and streamed text are lost.

## Approach
`plugin-react` already mounts TanStack Router (`createRouter({ routeTree })`), so the app has a client router, but react-ui has no seam to it; its own comment says "react-ui has no seam to the app's router". The app cannot route around it without a workaround: intercepting anchor clicks globally, or wrapping each roster component, both rebuild what react-ui owns. `useRoute()` reads `popstate` alone, so a router push would also leave the `Shell`'s selected place stale.

## Shape
A new plugin-react list slot `react.slots.routerBindings` takes one named import per contribution, a function of the router; the default mount calls each right after `createRouter`. react-ui contributes `bindRouter` from `@fcalell/plugin-react-ui/lib/navigate` while routes are on, so it imports nothing from TanStack and a `routes: false` app is untouched.
`lib/navigate.ts` becomes the one routing module: `bindRouter` stores the router (a structural type) and subscribes `useRoute` to `onResolved`; `navigate(route)` keeps its signature and calls `router.navigate({ href })` for a route while bound, `location.assign` otherwise; new `isRoute` and `follow`.
Every react-ui anchor stays an `<a href>` and adds `onClick={follow}`: a plain primary click on a route calls `preventDefault` then `navigate`, so new tab, copy link and middle click still work.
The Shell and rows read the router's resolved location, so the selected place flips with the page drawn. No phone code: it already routes through expo-router. Typing web `Route` from the registered routes is not part of this story.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.
