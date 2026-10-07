---
id: 003-102
status: backlog
sessions: {}
---
# react-ui: a Diff's gutter and wrapped lines carry only the columns they need

## Goal
Stead's file review (`routes/_now/…/review.tsx`; `review-file-1440-light`) draws an added-only hunk with an empty old-number column ahead of the new number, so "1 +" starts ~60 px in, and a wrapped line hangs by `DIFF_HANG` (`pl-control-x`) under a wide gutter.

Evidence, item screens critique unit u4 (main 54deb15, `file-screen.tsx:130`, shots `file1-1280-light`, `file1-390-dark`): an added-only hunk draws an empty old-number column, so new numbers start about 60 px in at 1280 (number cell at 654, 29 wide inside a gutter of 56 or more) and about 53 px at touch, against a gutter range of 40 to 56 with its numbers; at the phone one blank column is wasted where the 15 px mono code line hangs.

## Approach
diff/index.tsx always emits two `DIFF_GUTTER` cells (`min-w-figures pl-inside`) per row. Only the empty old column is visible in the screen; the wrapped hang is read from `HANG` and was not seen in a screenshot, so check it first.

## Acceptance criteria
- [ ] A hunk whose lines are all added or all removed draws one number column.
- [ ] A wrapped continuation hangs by a fixed small indent under the code's start, not the gutter's width.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
