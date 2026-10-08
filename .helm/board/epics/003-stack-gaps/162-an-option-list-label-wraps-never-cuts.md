---
id: 003-162
status: done
sessions: {}
---
# react-ui: an OptionList option's label wraps to the measure instead of cutting to one line

## Goal
Stead's Epic review item (github.com/fcalell/stead, `packages/server/src/app/ui/item-screen.tsx`, the Concerns `Form` of one `OptionList` whose option `label` is the concern's sentence; design/07-interface.md "Epic review (Code)": "each concern a row with its tick and its line of evidence"). A concern is a whole sentence the operator judges before ticking it for a story, and no act reveals the rest of a cut one. Rendered, the label is cut with an ellipsis at 1280 ("Nothing covers a month with no reading, so its count is blank, not …") and at 390 ("Nothing covers a month with no readi…"). Evidence: Stead critique unit u12 (Stead `e15905e`, shots `epic-1280-light`, `epic-390-light`, `a-epic-ticked-1280-light`).

## Approach
`OptionList` draws the label as `LABEL = "min-w-0 grow truncate"` and a two-line option's title as `TITLE = "truncate"` (`plugin-react-ui/src/ui/components/option-list/index.tsx`), so a label longer than the row is always cut and the option has no wrapping form. The option's description (`ROW.lines.two`) is a different text (a note on the choice) and is cut the same way, so the concern cannot go there either. `ListRow` has the same one-line cut, which 003-55 answered with a wrapping title; no story gives `OptionList` that. 003-118 and 003-120 keep cut text's space and say what yields first, not that a label may wrap. The app cannot wrap the label in its own node (the `option` map takes strings) nor lift the concern into a `Prose` beside the tick. Reference: Linear's issue rows and the record-pane two-line rows, which wrap the title to the measure.

## Acceptance criteria
- [x] An `OptionList` option's label wraps to the row's width at 375, 768 and 1440 px, the tick staying at the first line, so a sentence of three lines reads whole.
- [x] A short label keeps its one-line row height, and a loading row keeps its height.
- [x] The OptionList showcase holds an option with a long label, measured at 390 and 1440.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, and whether it is one reading with 003-55.

## Ruled
An option's label always wraps: no option, no prop, no token. A label is the whole text of a choice, read whole in a decision card.

## Built
- react-ui `option-list`: `LABEL` and `TITLE` wrap (`wrap-break-word`) instead of truncating; an unmarked option row is `row({lines: "whole"})` plus `min-h-row`, a marked one stays `two`. Waiting and note rows keep `one`.
- native-ui `option-list`: the title and label drop `numberOfLines={1}`; the unmarked row takes the same `whole` + `min-h-row`.
- ui-core `roster.ts`: OptionList `draws` gains `ROW.lines.whole`; DESIGN.md regenerated.
- `apps/showcase/behaviour/option-list.stories.tsx`: `LabelWraps375`, `LabelWraps390`, `LabelWraps768`, `LabelWraps1440` (tick inside the first line box, row height == lines * line + 2 * pair), `ShortRowKeepsWaitingHeight375/768/1440` (a short label's row height equals the waiting row's).
- Evidence: `pnpm check` turbo part, the three `verify` runs and Biome pass. The option-list behaviour stories pass, 9 of 9; a one-line unmarked row is as tall as its waiting row at 375, 768 and 1440, so no contract gap.

## Critique (second round)
Ship, by a fresh critic at 1280, 390 (touch) and the widths the story names, light and dark (scratchpad `critique/r2-sheet/report.md`).
