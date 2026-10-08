---
id: 003-190
status: todo
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
- [ ] A Banner above a Thread in a Place body with no foot stands at the page inset on its left,
  right and top, and the region's gap above the log, at 375, 768 and 1440 px, light and dark.
- [ ] The Thread's log still spans the body edge to edge, scrolls inside it and stays pinned to the
  latest entry; the input stays docked.
- [ ] A Split main's paired head and Banner over a Thread draw as before.
- [ ] Both platforms; `pnpm check`, the three verifies and the scoped stories run pass.
