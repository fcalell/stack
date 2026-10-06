---
id: 003-96
status: backlog
sessions: {}
---
# react-ui: an ActionBar's acts stand by the content they act on, and on touch stay above the tab bar

## Goal
`ActionBar fit="end"` right-aligns the acts to the far edge of a wide pane, detached from the content they act on: Stead's stalled card (4 acts), the stopped answer item and the job card's lone "Stop the job" float at the pane's right edge in a 1100 px main. On touch, the page-edit form stacks Save over Discard (a full-width pair) and the last act sits under the tab bar. Stead: `routes/work/-components/card.tsx`, `app/ui/item-screen.tsx`, the knowledge editor. Screens: Stead's sign-off set (scratchpad `signoff/`): `stalled-1440-light`, `item-stopped-answer-1440-light`, `card-job-1440-dark`, `page-edit-375-light`.

## Approach
`ACTION_BAR` = `gap-pair` with `fit: end | full` both empty (variant-tables.ts) and a region docking is the only thing that sets its measure; 88 covers the main's width, but a bar at the measure still needs an alignment rule. On touch the page body's foot does not reserve the tab bar's height, so the last act scrolls under it.

## Acceptance criteria
- [ ] On desktop an end-fit bar stands under its content's column, not at the pane's far edge.
- [ ] On touch a bar's acts sit fully above the tab bar at the end of the scroll, and a save/discard pair does not read as two stacked full-width bars.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
