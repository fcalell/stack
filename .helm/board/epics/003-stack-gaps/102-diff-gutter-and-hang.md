---
id: 003-102
status: review
sessions: {}
---
# react-ui: a Diff's gutter and wrapped lines carry only the columns they need

## Goal
Stead's file review (`routes/_now/…/review.tsx`; `review-file-1440-light`) draws an added-only hunk with an empty old-number column ahead of the new number, so "1 +" starts ~60 px in, and a wrapped line hangs by `DIFF_HANG` (`pl-control-x`) under a wide gutter.

Evidence, item screens critique unit u4 (main 54deb15, `file-screen.tsx:130`, shots `file1-1280-light`, `file1-390-dark`): an added-only hunk draws an empty old-number column, so new numbers start about 60 px in at 1280 (number cell at 654, 29 wide inside a gutter of 56 or more) and about 53 px at touch, against a gutter range of 40 to 56 with its numbers; at the phone one blank column is wasted where the 15 px mono code line hangs.

## Approach
diff/index.tsx always emits two `DIFF_GUTTER` cells (`min-w-figures pl-inside`) per row. Only the empty old column is visible in the screen; the wrapped hang is read from `HANG` and was not seen in a screenshot, so check it first.

## Acceptance criteria
- [x] A hunk whose lines are all added or all removed draws one number column.
- [x] A wrapped continuation hangs by a fixed small indent under the code's start, not the gutter's width.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Built
A Diff draws a side's number column only when a line of the diff carries that side's number, so a diff that only adds or only removes draws one; the hunk header spans the columns drawn. The columns are the diff's, not each hunk's, so every hunk's cells stay aligned in one table. The waiting form draws both, since the lines are unknown (`plugins/react-ui/src/ui/components/diff/index.tsx`, `plugins/native-ui/.../diff/index.tsx`).
The hang needed no change: the code cell's `-indent-control-x` over `pl-control-x` puts a continuation one control inset in from the cell's start, which is the code's start whatever the gutter's width; the measurement below confirms it. The phone has no hang (React Native has no text indent), as its comment says.
Evidence: `apps/showcase/behaviour/diff.stories.tsx` (an added-only diff has three cells per row and a header spanning three; a wrapped line's second line starts one `control-x` after the first, which starts at the cell's edge) passes in the desktop run; `stories/Diff.stories.ts` passes.
