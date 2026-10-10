---
id: 003-190
status: review
sessions: {}
---
# react-ui, native-ui: a part above a filling Thread keeps the page inset

## Goal
A Place body holding a Thread takes the filled form (`BODY_FILLED` in
`plugins/react-ui/src/ui/components/thread/fill.ts`: no `PAGE_BODY` inset, no gap) so the log runs
edge to edge. A part placed above the Thread in that body (a Banner, as 003-163 allows) takes the same
form: measured at 0 px left, right and top, and 0 px to the log (003-163 `## Built`). In a Split's main
the same Banner pairs with the ItemHeader and stands at an inset with the pair gap, so one Banner
draws two ways.

## Approach
Ruled by the owner: in a filled region, the Thread alone runs edge to edge; every sibling above it
keeps the page inset and stands the region's gap from the log, as a Banner under a head does in a
Split main. Derived from the mark (the Thread's `data-fill`), no new prop, slot or variant; the
contract cell the filled form restates says it, and `fill.test.ts` holds it. Both platforms
(native-ui's `holdsThread` form). Rules text for a part above the Thread in both guides.

## Acceptance criteria
- [x] A Banner above a Thread in a Place body with no foot stands at the page inset on its left,
  right and top, and the region's gap above the log, at 375, 768 and 1440 px, light and dark.
- [x] The Thread's log still spans the body edge to edge, scrolls inside it and stays pinned to the
  latest entry; the input stays docked.
- [x] A Split main's paired head and Banner over a Thread draw as before.
- [ ] Both platforms; `pnpm check`, the three verifies and the scoped stories run pass.

## Built
Web: `PART_ABOVE_FILLED` (`plugins/react-ui/src/ui/components/thread/fill.ts`) gives each sibling above the Thread in a footless Place body `mx-page`, and the first `mt-page`, under the Thread's `data-fill` mark (child combinators only, no `:has([data-fill])` at depth); `BODY_FILLED` zeroes the inset and keeps the body's gap, so the part stands `gap-sections` from the log. `fill.test.ts` holds both to `PAGE_BODY`. Native: `headPaired(children, inMain, fills)` wraps each part before the Thread in `mx-page` (the first also `mt-page`), and the filled body keeps `gap-sections` (`BODY_FILLED` in `place/index.tsx`); `thread.test.ts` holds both to `PAGE_BODY`. A Split main is untouched (`headPaired` without `fills`; `MAIN_FILLED`, `COLUMN_FILLED`, `holdsThread` unchanged). The new classes are in the overlay allowlists (`scripts/overlays.ts`, native `scripts/verify.ts`). Rules text in both guides and `ui-core.md`. Stories `PlaceBodyBanner375/768/1440` (`apps/showcase/behaviour/split.stories.tsx`, replacing `PlaceBodyBannerMeasured`) assert the Banner's left, right and top insets at the page inset and its gap to the log at the sections gap, the log edge to edge, scrolling and at its end, and the input inside the body. The scoped stories run passes (36 files, 179 tests, peak 4444 MiB), the Split `ThreadUnderBanner*` stories among them. The stories run in the showcase's default mode; the insets are spacing tokens, the same in light and dark, so dark is not asserted separately. The phone render is unchecked on a device.
Native unrendered: Both platforms.

## Review
Web accepted 2026-10-10; waits on the native render. The "both platforms" box stays open. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass.
