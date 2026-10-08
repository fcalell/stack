---
id: 003-209
status: backlog
sessions: {}
---
# react-ui: a List's hairline between rows draws straight, not along the row's rounded ends

## Goal
Stead's System knowledge tree (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/knowledge.tsx`, the stale Section's `List` at lines 205-213 and the kind Sections' at 220-229: a bare `List` of two-line rows, `meta` declared, no Group). In the 1440 light render (Stead critique `critique/u10/shots4/tree-sail-1440-light.png`) the hairline under rows 1 and 2 ends in rounded curves that reach past the text column, none under row 3, so the lines read as the lower edges of lifted cards at 2x. Computed box-shadow is none and the row's border is 0 in the page's own style; the line is the List's divider. The same was seen on Now's rows in an earlier critique. Stack at `74a0e3d`, HEAD checked.

## Approach
`LIST_DIVIDED` (`-mx-control-x divide-y divide-edge`, ui-core variants.ts) draws the hairline as a border on each row but the last, and the row's box carries `rounded-row` (variant-tables.ts `row`, list ground; list-row/index.tsx `row({ ground })`), so the border follows the radius and curls up at both ends. The wash needs the radius (a hovered or current row is an inset rounded wash, square on touch); the hairline does not. The app passes only `items` and a `row` map and has nothing to set: geometry classes go on host elements only. Nothing at HEAD touches either (`git log 74a0e3d..HEAD` on variants.ts holds no List divider change). Not 003-109, which added the divider and is done; this is its drawing.

## Acceptance criteria
- [ ] A List's divider between two-line rows is a straight full-width hairline at every width, density and mode, with no curve at its ends, while a row's wash stays rounded.
- [ ] A List in a Group and a tree List are unchanged.
- [ ] The List `Separators` story is measured at 2x, the hairline's ends against the row's corners, by the critique.

## Open questions
- [ ] Its shape (a divider drawn by a pseudo-element or a wrapper rather than the row's border, or the radius moved onto the wash): the stack session decides, and whether native-ui, which draws the hairline per row, shares it.
