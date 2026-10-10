---
id: 003-147
status: done
sessions: {}
---
# react-ui: a desktop side Sheet for a short form is not a full-height drawer

## Goal
Stead's New epic (three checkboxes) and Add a repo (one select) sheets draw at 1440 px as a 640 by 900 drawer with about 700 px of empty body under the field, and the blocked reason ("Pick a repo.") sits under the submit at 11 px (github.com/fcalell/stead, `packages/server/src/app/routes/work/-components/sheets.tsx`; design/07-interface.md "Work"). Evidence: critique unit u6, shots `new-epic-1440-light`, `addrepo-blocked-1440-light` (Stead scratchpad `critique/u6/shots/`, stack at `5564217`). Reference: Notion's "New workspace" and Linear's create dialogs in the sheet-and-confirm pattern page.

## Approach
`Sheet` with `fit` "form" (the default) is the full-height side sheet (`SHEET_SIDE`), whatever the form's length; `SheetCentered` exists in ui-core variants but the Sheet takes no way to say a short form. The app cannot size the sheet (geometry goes on host elements only). 003-129 is a docked sheet's body floor, 003-99 the head's rhythm; the reason's size is 003-140's. Seen at stack `5564217`.

## Acceptance criteria
- [x] A Sheet whose body is short on the desktop sizes to its content (a floor and a ceiling) or draws centred, and keeps the full-height side form for a long one.
- [x] The Sheet showcase holds a one-field form and the critique measures the empty body left.

## Built

No `fit` value (ruled). The desktop side sheet is its content's height with the layer's height as ceiling, hung from the top at the end edge (`LAYER_SIDE` `items-start`, `max-h-full` on the box in `plugins/react-ui/src/ui/components/sheet/base.tsx`); a form past the viewport is the full height with its body scrolling. The second-page frame in `plugins/react-ui/src/ui/showcase/frames/sheet.tsx` now holds one `FormField`. Evidence: `behaviour/sheet.stories.tsx` `SideSheetFitsItsContent` passes (top 0, right edge at the viewport's, under half the height), and the generated Sheet stories pass. The look (a card hung at the end edge, against a drawer or a centred card) stands for the owner's sign-off. 003-306 reverses this: the desktop's short sheet is a centred card, a long one the full-height side sheet.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether `fit` gains a value or the Sheet decides by its body.

## Critique
Rework: at 4x the side sheet's foot draws a square corner about 2 px past the 8 px bottom-left radius. The look (a 640 x 222 card at the top end, the page dimmed below) is the owner's earlier ruling.

## Rework

The side sheet's foot follows the box's radius (`rounded-bl-sheet` on the desktop foot, `sheet/base.tsx`), so its raised ground ends at the 8 px corner. Judged by the critique at 4x.

## Critique (second round)
Ship, by a fresh critic at 1280, 390 (touch) and the widths the story names, light and dark (scratchpad `critique/r2-sheet/report.md`).
