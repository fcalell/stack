---
id: 002-10
status: done
sessions: {}
---
# native-ui: the roster's href, back and route props are typed against the app's routes

## Goal
002-08 types a phone app's `Link` and `router` calls against its route files, but the roster's
own route props (`ListRow`'s and `FileRow`'s `href`, `Screen`'s `back`, a place's `route`) stay
`string`, so a mistyped route in a component prop compiles. They are ui-core descriptor types,
which are platform-free.

## Approach
Decide in the story: native-ui types those props as expo-router's `Href` (a platform overlay on
the descriptor types), or ui-core's descriptors take a route type parameter each platform fills.
Prefer the shape that changes no call site.

## Acceptance criteria
- [x] (test) in a phone app, a `ListRow` `href` and a `Screen` `back` naming a route the app does not have fail the type-check.

## Progress
Built; `pnpm check` and `pnpm verify` pass, and the (test) criterion holds: in a phone app a `ListRow` `href` or `Screen` `back` naming a route the app lacks fails the type-check (checked in apps/phone too). Shape: ui-core declares an empty `RouteRegistry` and `Route` (string until registered); native-ui registers expo-router's string `Href`, so no call site changes and ui-core stays platform-free. The native `Link` keeps a string `href` (it opens URLs).
