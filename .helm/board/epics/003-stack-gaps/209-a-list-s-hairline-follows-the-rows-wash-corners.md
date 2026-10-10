---
id: 003-209
status: done
sessions: {}
---
# react-ui: a List's hairline between rows draws straight, not along the row's rounded ends

## Goal
Stead's System knowledge tree (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/knowledge.tsx`, the stale Section's `List` at lines 205-213 and the kind Sections' at 220-229: a bare `List` of two-line rows, `meta` declared, no Group). In the 1440 light render (Stead critique `critique/u10/shots4/tree-sail-1440-light.png`) the hairline under rows 1 and 2 ends in rounded curves that reach past the text column, none under row 3, so the lines read as the lower edges of lifted cards at 2x. Computed box-shadow is none and the row's border is 0 in the page's own style; the line is the List's divider. The same was seen on Now's rows in an earlier critique. Stack at `74a0e3d`, HEAD checked.

## Approach
`LIST_DIVIDED` (`-mx-control-x divide-y divide-edge`, ui-core variants.ts) draws the hairline as a border on each row but the last, and the row's box carries `rounded-row` (variant-tables.ts `row`, list ground; list-row/index.tsx `row({ ground })`), so the border follows the radius and curls up at both ends. The wash needs the radius (a hovered or current row is an inset rounded wash, square on touch); the hairline does not. The app passes only `items` and a `row` map and has nothing to set: geometry classes go on host elements only. Nothing at HEAD touches either (`git log 74a0e3d..HEAD` on variants.ts holds no List divider change). Not 003-109, which added the divider and is done; this is its drawing.

## Acceptance criteria
- [x] A List's divider between two-line rows is a straight full-width hairline at every width, density and mode, with no curve at its ends, while a row's wash stays rounded.
- [x] A List in a Group and a tree List are unchanged.
- [x] The List `Separators` story is measured at 2x, the hairline's ends against the row's corners, by the critique.

## Open questions
- [x] Its shape (a divider drawn by a pseudo-element or a wrapper rather than the row's border, or the radius moved onto the wash): the stack session decides, and whether native-ui, which draws the hairline per row, shares it.

## Ruled

The divider is drawn by a pseudo-element on each row but the last, not by the row's border, so it is a straight full-width bar and the row's `rounded-row` wash stays. Group and tree lists are unchanged. Native rows are square and keep their per-row hairline. The ui-core contract holds no variant-prefixed class, so `LIST_DIVIDED` stays `-mx-control-x` and the web's pseudo-element classes are an overlay in react-ui's `list/index.tsx` (the fallback the ruling set in advance).

## Built

`DIVIDER` in `plugins/react-ui/src/ui/components/list/index.tsx` composed with `LIST_DIVIDED` (now `-mx-control-x`) for a divided list; `divide-y divide-edge` leaves it; the overlay allowlist carries the six classes. Evidence: `behaviour/list.stories.tsx` `Separators` asserts the first row has no bottom border, its `::after` is absolute, 1px high, at left 0 and right 0 and as wide as the row, with no radius and a drawn ground, the last row and the one-line rows draw none, the row's radius stays 6px, and a List in a Group keeps the group's border hairline. Left for the critique: the first box's reading at every width, density and mode, and the third (the hairline's ends against the row's corners at 2x).

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique (nit only): the hairline is straight and row-wide at every width, density and mode (measured on layout-list--rest); the Separators story rows are non-interactive, so wash against hairline shows in no behaviour story.
