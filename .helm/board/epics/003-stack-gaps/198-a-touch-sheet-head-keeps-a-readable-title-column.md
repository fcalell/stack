---
id: 003-198
status: review
sessions: {}
---
# react-ui: a touch Sheet's head keeps a readable title column beside a long submit

## Goal
Stead's New workflow sheet and its "What the workflow gains" confirm sheet (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/new-workflow.tsx` and `node-sheet.tsx`; design/07-interface.md "A workflow: the canvas") put a long submit label in the touch head: "Make the workflow", "Save with these gains". Evidence: Stead's workflow canvas critique unit u11 at stack `74a0e3d`, Stead scratchpad `critique/u11/shots/`:
- `n-filled-375-light`: at 375 px "New workflow" wraps to two lines in a title column of about 150 px between the 44 px Close and the 290 px submit.
- `f-gains-390`: at 390 px "What the workflow gains" wraps to three lines in the same column, and the head stands 3 lines tall beside a one-line submit, so the title reads as a stack of fragments.

## Approach
003-91 made the title wrap whole instead of truncating, which is right, but the touch head row gives the bar-fit submit its whole label width first and the title the remainder; with a label of 17 to 21 characters the remainder is 130 to 150 px at 375 and 390. Nothing the app passes changes it: the submit label is the act's own word (the design names the act by what it does), and the title is the sheet's name. Unchanged at stack `HEAD` past `74a0e3d` (`plugins/react-ui/src/ui/components/sheet/base.tsx` has only the 5416e3ac confirm/Close change). The reference is the sheet-and-confirm pattern page under ui-core's `guide/patterns`, where a title keeps a readable measure and the submit yields.

## Acceptance criteria
- [x] A touch Sheet's head at 375 and 390 holds its title on at most two lines when the title is up to about 25 characters beside a submit label of up to 21 characters, the submit giving way (wrapping or a shorter fit) before the title drops below a floor column.
- [x] A touch head with a short submit ("Done", "Open the thread") is unchanged, and the submit stays at the 44 px floor.
- [x] The Sheet showcase holds a long-labelled submit at 375 and 390, measured by the critique.

## Open questions
- [x] Its shape (a title-column floor, the submit label wrapping, the submit dropping to the foot or a second head line on touch): the stack session decides.

## Owner ruling
The owner accepts both readings: the submit drops to its own end line when it does not fit beside the title (its 44 px and its whole name kept), and "unchanged" for a wide submit holds wherever the title's floor still fits beside it.

## Ruled
The touch head row wraps when it carries a submit (`SHEET_HEAD_TITLE = "max-w-3/5"` on the title block, a `flex-wrap` row, the submit in an `ms-auto` wrapper): a submit that does not fit beside the title column drops whole, at its 44 px, to a second head line at the row's end; no prop, no token. The owner's two answers hold: the drop is the submit giving way, and a short submit stays inline wherever the title column still fits beside it.

## Built
Web `sheet/base.tsx` and native `Head()` in `sheet/base.tsx` carry the wrapping row; `SHEET_HEAD_TITLE` is in ui-core's `variants.ts` and the Sheet roster entry (`draws`, `holds`). Both `rules.md` and `ui-core.md` state the shape.

Measured at HEAD before the change (touch, row 343 px at 375, 358 px at 390; Close 44, gap 8): "New workflow" beside "Make the workflow" (submit 173 px) at 375 gave a 110 px title on 2 lines; "What the workflow gains" beside "Save with these gains" (submit 192 px) gave a title of 91 px on 3 lines at 375 and 106 px on 3 lines at 390. The story's 150 px and 290 px do not reproduce (the submits are 173 and 192 px); the wrap and its cause (the title shrinking to what the submit leaves) do.

After: the title is 205.8 px (3/5 of the row) on at most 2 lines in every long-submit case at 375 and 390 ("What the workflow gains" is 1 line at 390), and the submit drops to a second line at 44 px with its right edge at the row's end. "Done" stays inline beside "Rename domain" at both widths, the submit at 289 px as before. "New workflow" beside "Make the workflow" at 390 stays inline (it fits). "Open the thread" drops beside any title over about 12 characters, per the owner's reading.

Stories in `apps/showcase/behaviour/sheet.stories.tsx` (`touchHead`: `TouchHeadKeepsItsTitle`, `TouchHeadLongSubmit375`, `TouchHeadLongSubmitFits390`, `TouchHeadGains375`, `TouchHeadGains390`, `TouchHeadLongTitle375`, `TouchHeadLongTitle390`, `TouchHeadDone375`, `TouchHeadDone390`, `TouchHeadShortTitleOpen375`) measure title lines, the submit's top against the title's, its 44 px and its end edge. The sheet, place-foot, split, table and form-leave story files pass (80 tests, peak 2384 MiB). `pnpm check` turbo part 45/45; the three `verify` runs pass. The third box waits on the critique.

Native unrendered. The native head is held by `verify` and type-check only; Yoga's wrap with a percent `max-w` is not rendered.
