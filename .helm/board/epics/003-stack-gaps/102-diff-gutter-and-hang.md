---
id: 003-102
status: backlog
sessions: {}
---
# react-ui: a Diff's gutter and wrapped lines carry only the columns they need

## Goal
Stead's file review (`routes/_now/…/review.tsx`; `review-file-1440-light`) draws an added-only hunk with an empty old-number column ahead of the new number, so "1 +" starts ~60 px in, and a wrapped line hangs by `DIFF_HANG` (`pl-control-x`) under a wide gutter.

## Approach
diff/index.tsx always emits two `DIFF_GUTTER` cells (`min-w-figures pl-inside`) per row. Only the empty old column is visible in the screen; the wrapped hang is read from `HANG` and was not seen in a screenshot, so check it first.

## Acceptance criteria
- [ ] A hunk whose lines are all added or all removed draws one number column.
- [ ] A wrapped continuation hangs by a fixed small indent under the code's start, not the gutter's width.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
