---
id: 003-320
status: review
sessions: {}
---
# react-ui: a row's status stays whole and the other parts yield first

## Goal
Stead's design critique of 2026-10-11 (github.com/fcalell/stead, `packages/server/test/review/findings-2026-10-11.md`, c1, c3, c5) found a `ListRow`'s status word cut ("Waiting …" in the 335 px Now list and at 390; "Watches paused for usage · resu…" and "Paused for usage · resume…" on System's Usage row; "Fetched 3 min…" on a Repos row whose path stays at 300 px) while the earlier parts of the meta line stood. The record-pane pattern (`packages/ui-core/guide/patterns/record-pane.md`) has the line yield in order, the later parts first, then the chip, "while the first part (naming the item) and the status word stay whole". The roster instead let the status share the first part's tier, so a long first part took a status's room in proportion.

## Approach
The status takes no share of the meta line's overflow (`shrink-0`) and is held to the line less the floor the first part keeps (`figures`, the width of four figures): the later parts, the chip, the lock's label, the warning's label and the first part all yield before it, and only a status wider than that is cut, at the line's end. With no first part it is held to the line. The short form (`short`) draws where the long form would still be cut, so it is now the narrow-line fallback. `DefinitionRow` has no meta line; its status value stands whole the same way, the label wrapping to the room it leaves, the status held to three quarters of the line.

## Acceptance criteria
- [x] In a 320 px pane and a 360 px list, at the desktop and touch density, a row's status ("Fetched 3 minutes ago", "Waiting for you") stands whole while its first part (and later parts) truncate.
- [x] A status wider than the whole line is cut within the row, no box passing the row's edge.
- [x] A `DefinitionRow`'s status value stands whole and the label wraps to what it leaves; one wider than three quarters of the line is cut.
- [x] The short form still draws where the long one would be cut, and the line's yield order for the other parts holds.
- [ ] Native the same.

## Built
`list-row/status.tsx`: the status mark is `flex shrink-0 min-w-0` with `max-w-full` (no first part) or `max-w-[calc(100%-var(--spacing-figures))]` (a first part stands before it; `list-row/index.tsx` passes `beside`); `MARK_SHORT` is gone since every status now keeps its width. `definition-row/index.tsx`: a status value is `VALUE_STATUS` (`flex shrink-0 min-w-0 ms-auto max-w-3/4`). The overlay allowlist gains the two `max-w` classes; the meta line's comment, `rules.md` (the short form), and `ui-core.md` say the new order.

Stories: `row-meta.stories.tsx` `StatusStaysWhole` (+ Touch): "Fetched 3 minutes ago" and "Waiting for you" unclipped in the 320 and 360 columns while their first parts are clipped, a status of a sentence cut within its row; `definition-row.stories.tsx` `StatusValueStaysWhole` (+ Touch). Before the fix the DefinitionRow's "Fetched 3 min ago" word was 107 px of text in a 33 px box on desktop (124 of 0 on touch), and the ListRow stories failed on the status clipped; after, both are whole. `list-row-status.stories.tsx`: the short-form stories now narrow the columns to 220 (the long form is cut only where the line is less than the words and the first part's floor), `StatusShort`, `StatusLong` and the rest of the file pass.
Native unrendered: the phone's meta line keeps the shared tier (the native box stays open); `native-ui` rules and `ui-core.md` say so.
