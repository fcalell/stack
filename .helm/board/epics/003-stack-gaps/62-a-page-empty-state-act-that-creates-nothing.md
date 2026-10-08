---
id: 003-62
status: done
sessions: {}
---
# react-ui: a page's empty state whose act creates nothing

## Goal
Stead's Not found page (github.com/fcalell/stead, `packages/server/src/app/routes/$.tsx`; `design/07-interface.md`, "Addresses") is a `Place` holding an `EmptyState`, "Nothing is at this address.", whose act "Open Now" goes back to the home place. On a page, `EmptyState` draws its act as the filled create act with the plus glyph, so a way back reads as "create".

## Approach
`EmptyState`'s `act` takes an `Act` with no say over its glyph or its kind, and its page form always draws the create act. A `Button` beside it would stand outside the empty state's column, and a host element would restyle it.

## Shape
A new public roster part `Missing` on both platforms: the existing missing form, which stack draws internally, as a part for a missing state the app decides from data. Props `sentence?: string` (default the `missing` word) and `act?: LinkAct` (default Back to the Shell or Split route).
ui-core `descriptors.ts` gains `LinkAct { label: string; href: Route }`, replacing web `BackLink` and the phone's `Act`-typed `useBackAct`. The public part wraps an internal one that takes `fill`; `tone` stays internal.
`EmptyState`'s act stays the create act: deciding by an act's kind misdraws a create that navigates ("Add a repo"), and a flag is a look option. Cells are unchanged: rest ink, no mark, the act secondary at the bar fit with no plus. The web act is a `ButtonLink` (inherits `follow` from 61); the phone presses through `navigate(href)`.
Component count 62 -> 63. Stack drawing an unknown address itself is filed as story 85.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/section/report.md`).
