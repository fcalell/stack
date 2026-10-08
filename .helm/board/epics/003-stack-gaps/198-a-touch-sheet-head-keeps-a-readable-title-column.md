---
id: 003-198
status: backlog
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
- [ ] A touch Sheet's head at 375 and 390 holds its title on at most two lines when the title is up to about 25 characters beside a submit label of up to 21 characters, the submit giving way (wrapping or a shorter fit) before the title drops below a floor column.
- [ ] A touch head with a short submit ("Done", "Open the thread") is unchanged, and the submit stays at the 44 px floor.
- [ ] The Sheet showcase holds a long-labelled submit at 375 and 390, measured by the critique.

## Open questions
- [ ] Its shape (a title-column floor, the submit label wrapping, the submit dropping to the foot or a second head line on touch): the stack session decides.
