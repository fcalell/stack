---
id: 003-305
status: review
sessions: {}
---
# ui-core: a Split's list sizes to its content and the main fills the rest

## Goal
Stead's Splits hold their list and pane at fixed widths whatever they hold. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "splits should probably be sized based on the content, with the last one taking the whole remaining space (what auto-auto...1fr would do for grid)".

## Approach
`list: "360px"` and `pane: "320px"` (`packages/ui-core/src/tokens.ts:1083-1084`) feed `SPLIT_LIST` and `SPLIT_PANE` (`packages/ui-core/src/variants.ts:883,885`). 003-122 (done) builds its breakpoint arithmetic on the fixed 360 px list, so this moves it too. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] The list and pane size to their content between a floor and a ceiling; the main takes the rest. (Built; the sizes await the batch browser run.)
- [ ] The breakpoints 003-122 set still hold at the widths they name. (By construction: the ceilings are the old widths; the stories await the batch browser run.)

## Open questions
- [x] Its shape (content sizing, or a list width the app names): the stack session decides.

## Ruled
Content sizing, no consumer option. `list` (360) and `pane` (320) stay as the ceilings and one new width, `region-min` (240), is the shared floor; `SPLIT_LIST` and `SPLIT_PANE` spell `min-w-region-min max-w-<ceiling>` and no `w-`, and the regions already stand `shrink-0`, so their flex basis is their content. Because the ceilings are the old fixed widths, 003-122's arithmetic holds as the least the main gets (a page 768 wide still leaves the main at least 408; the breakpoints are container queries and do not move). A list width the app names is rejected: a new consumer option, and an app cannot know its rows' width. Below `tablet` the list stands alone at the page's width (`max-w-none` beside `w-full`).
Cost, stated: a list's width follows its rows (a filter, a load), and a skeleton's percentage bars contribute nothing, so a loading list stands at the floor.

## Built
- `packages/ui-core/src/tokens.ts`: width `region-min`; `variants.ts`: `SPLIT_LIST`, `SPLIT_PANE`; roster: Split owns `region-min`; `verify.ts` width count 14; README and regenerated `DESIGN.md`.
- `plugins/react-ui/src/node/theme.ts`: `min-w-*` is generated for the widths.
- `plugins/react-ui/src/ui/components/split/index.tsx`: the list names itself the anchor `--split-list` and drops `max-w` below `tablet`.
- `plugins/react-ui/src/ui/components/place/index.tsx`, `scripts/overlays.ts`: the touch Place's floating act layer took `w-list` to centre on the list; with the list at its content's width the layer takes its edges from the list's anchor (`left`/`right: anchor(--split-list ...)`, falling back to the layer's full width).
- Rules and `ui-core.md` say how the regions size.
- Evidence: `apps/showcase/behaviour/split-record.stories.tsx` `ListSizesToItsContent`, `ListStopsAtTheCeiling`, `ListAtTheCeilingKeepsTheTabletBreakpoint`, `ListBelowTabletStandsAlone`. Written, not run: they await the batch browser run, as does the anchor-centred act (touch tablet, unrendered here).
- Native unrendered: the phone stands one region at a time at the page's width, so nothing changes there; the widths emit as before.
