---
id: 003-88
status: review
sessions: {}
---
# react-ui: a record in a Split's main reads at the measure

## Goal
Stead's items open as Now's record in the Split's main, and design/07-interface.md says their body reads at the measure (github.com/fcalell/stead, packages/server/src/app/ui/item-screen.tsx). At 1440 the body runs 792 px wide.

Evidence, item screens critique unit u4 (main 54deb15, shot `r0-1440-light`): the review body at 1440 runs the main's full width, the Check card 792 px and the criteria rows 792 px, against a 45 to 75 ch measure.

Further evidence, item screens critique unit u3 (main fdf91db, shots `it-action-1280-light`, `i-stopans-1280-light`): at 1280 an item's Code block and Group span the main at 632 CSS px while its Prose and Form fields stand at about 452 px, so the record's blocks share a left edge and have a ragged right; a DefinitionRow in "Where it goes" opens a gap of about 500 px between From and its value. Group, Code and Comparison need the measure as Prose and Form have it.

## Approach
`SPLIT_MAIN` is `gap-sections p-page` with no width cap; only Prose, ProseDiff, Form (in a page) and Thread cap themselves, so Sections, Groups and ActionBars stand at the main's full width. A host `max-w-measure` is not geometry the rules page allows. Seen at stack f6563f6.

## Acceptance criteria
- [x] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Ruled
The cell holds it. `SPLIT_MAIN rest` caps the padded record at the derived size `measure-inset` (the measure plus the page inset on both sides), so the content box is `measure` wide and stands at the main's start; no prop, and no part opts out (no Split main holds a Table or Canvas today, and the first consumer decides). A filling Thread lifts the cap under its mark.

## Built
- `packages/ui-core/src/variant-tables.ts`: `SPLIT_MAIN` `rest` adds `max-w-measure-inset`. The size is derived in `scales.ts` beside `measure` (see 003-152) and listed in the Split's roster entry.
- `plugins/react-ui/src/ui/components/thread/fill.ts` (and the overlay allowlist): the marked form of the main adds `max-w-none`, so a filling Thread still spans the main; `fill.test.ts` holds the marked form to the `fills` cell with the cap included.
- Native reads the same cell through `splitMain`, so a tablet-width record caps the same way; the head pairing (`item-header/pair.tsx`) wraps children inside the capped column unchanged.
- Docs: `ui-core.md`, `ui-core/README.md`, both rules pages; `DESIGN.md` regenerated.
- Evidence: `behaviour/split.stories.tsx` `RecordHoldsTheMeasure` (1440 page: the padded record is `measure-inset` wide at the main's start, the ItemHeader, Group, Code, Prose and ActionBar all end at inset + measure, the last act's right edge on that line) passes; `ui-core`, `react-ui` and `native-ui` verify pass.
