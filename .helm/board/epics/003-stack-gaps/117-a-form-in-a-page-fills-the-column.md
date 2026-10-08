---
id: 003-117
status: review
sessions: {}
---
# react-ui: a Form in a page, and its TextArea, fill the page's column

## Goal
Stead's knowledge editor holds one TextArea in a `Form` with `in: "page"` (design/07-interface.md "The knowledge editor"; github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/edit-text.tsx`). The page's header and prose run the column (480 px at 768 px, 792 px at 1440 px), while the Form is 452 px wide and its TextArea 426 px, 41 px short of the column at 768 px and 366 px short at 1440 px, so the field the page is for reads narrower than the text above it. Evidence: stead `design/evidence.md`, "The step 5b app at `b3b29d9`" (2026-10-06, stack at `5564217`, `page-edit-*.png`).

Evidence, System critique unit u8 (Stead `948b7ec`, shot `s11-note-edit`, `memory.tsx` EditText): the note editor's TextArea is 426 px wide in a 792 px measure at 1440, the same 426 px as above, so the width is not the knowledge editor's alone.

## Approach
`FORM` `in: page` is `max-w-measure` (ui-core variant-tables.ts), the same token as `PROSE`, yet the Form draws 452 px beside a 480 px or 792 px column, and the TextArea is 26 px inside the Form. The column's width is not the Form's cap, so either the Form's measure differs from the page's column or the field takes padding the column does not. Not 003-88: that story is a Split main's record body running the main's full width (792 px at 1440, no cap); here a cap holds and is the wrong width, and the field sits inside it. They may share the measure token's reading; the stack session settles that. A host `w-full` or `max-w-*` on the Form is not geometry the rules page allows. Seen at stack `5564217`.

## Acceptance criteria
- [x] A Form in a page, and a TextArea in it, stand as wide as the page's header and prose at 375, 768 and 1440 px.
- [x] The Form's showcase frame measures its field against the column beside it.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, and whether it is one reading with 003-88.

## Ruled
One reading with 003-88 and 003-152, and no prop. The Form's cap is `measure`, now the same px width as the column a Split's record stands in and as Text and Prose, so the 452 against 792 was a record whose header and parts ran the main's full width (88); a page's head stays the page's full width by design, and its running text and Form stand at the measure together. The 26 px is the field box's own border (1) and `control-x` inset (12) on each side, which the measurement read inside the box: Stead measured the `<textarea>` element; the box, the field's visible edge, is the Form's width.

## Built
- No Form or TextArea change: the leftover measured as the box's border and inset, not a gap.
- `behaviour/measure.stories.tsx` holds the Form and its field box (the textbox's parent) to the same width as a body and a meta Text at 1280 and at 375 px; it passes. 768 is the desktop set's measure.
- The Form's fields frame stands under a body paragraph so its edge reads against the column (`showcase/frames/form.tsx`).
- 003-136's filling `source` TextArea keeps filling its page Form (`HOLDS_FILL`); the story files for the TextArea pass.
