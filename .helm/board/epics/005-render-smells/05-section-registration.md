---
id: 005-05
status: review
sessions: {}
---
# react-ui, native-ui: a loading Section keeps its body and reads its registrations in render

## Goal
A Section learns its loading form by mounting its body, letting its rows, fields, waiters and
counts register in layout effects (web `lib/section.ts:26-52`), then swapping the body for
skeleton fields (web `components/section/index.tsx:137-183`, swap `:291`; phone
`section/index.tsx:115-161`, swap `:254-278`). A body's mount effects run and then it is torn
down: when `loading` turns true again a Form body loses its typed text and focus, and a Section
with rows renders its body twice on mount. Each List's `wait` and `count` set separate states
with a fresh Map per count (phone `:106-134`), re-rendering the head each time. `open` is seeded
from `folded` once and ignores later changes (web `:121`, phone `:101`).

## Approach
Decided by fcalell (2026-10-04): a frame learns what its children need up front, through props
or slots, never from a layout effect or a post-paint state push; a registration that must stay
(the parent cannot know a child's kind statically) is read in render from a host object.

The body stays mounted while loading, hidden when skeleton fields stand in, so nothing it holds
is lost. Rows, fields, waiters and counts register on one host object the Section reads in
render; the `loadingNow` ref, the `[loading]` layout effect and the mirrored `fields` state go.
`folded` is the initial fold by contract, named and documented so.

## Acceptance criteria
- [x] (test) the Section's skeleton-field count is a function of its host's registrations and `loading`, with no layout effect in `lib/section.ts` on either plugin.
- [ ] (live) web, settings at 375 with `&query=loading` toggled after typing in a field: the text survives; the head counts land in the first frame.
- [ ] (live) phone, on the harness: the same toggle keeps the typed text.

## Progress
Built (option 2d, answering fcalell's "make it work without" layout effects); `pnpm check` and `pnpm verify` pass. Web live at 375 touch: Devices' head reads its count in every frame with rows from the first, and typed text survives a refetch through 53 waiting frames. Depth rule: a Section counts and waits with collections standing as its direct children, inside a direct Group, or as a direct QueryBoundary; one inside an app's own component draws itself but adds nothing to the head. Open: the phone live criterion on the harness.
