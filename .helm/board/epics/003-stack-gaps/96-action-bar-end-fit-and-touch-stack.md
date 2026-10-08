---
id: 003-96
status: review
sessions: {}
---
# react-ui: an ActionBar's acts stand by the content they act on, and on touch stay above the tab bar

## Goal
`ActionBar fit="end"` right-aligns the acts to the far edge of a wide pane, detached from the content they act on: Stead's stalled card (4 acts), the stopped answer item and the job card's lone "Stop the job" float at the pane's right edge in a 1100 px main. On touch, the page-edit form stacks Save over Discard (a full-width pair) and the last act sits under the tab bar. Stead: `routes/work/-components/card.tsx`, `app/ui/item-screen.tsx`, the knowledge editor. Screens: Stead's sign-off set (scratchpad `signoff/`): `stalled-1440-light`, `item-stopped-answer-1440-light`, `card-job-1440-dark`, `page-edit-375-light`.

## Approach
`ACTION_BAR` = `gap-pair` with `fit: end | full` both empty (variant-tables.ts) and a region docking is the only thing that sets its measure; 88 covers the main's width, but a bar at the measure still needs an alignment rule. On touch the page body's foot does not reserve the tab bar's height, so the last act scrolls under it.

## Acceptance criteria
- [x] On desktop an end-fit bar stands under its content's column, not at the pane's far edge.
- [x] On touch a bar's acts sit fully above the tab bar at the end of the scroll, and a save/discard pair does not read as two stacked full-width bars.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Ruled
Desktop: the bar follows its column, which 003-88 caps, so no bar rule is added. Touch: the Save over Discard stack stays, since a touch act is 44 px and the stack is the system's rule for a pair of acts (Discard can be `quiet`). The tab bar reserve is a bug if it reproduces.

## Built
- Desktop: an end-fit bar in a Split's main ends at the record column's end (`SPLIT_MAIN rest`, 003-88); `behaviour/split.stories.tsx` `RecordHoldsTheMeasure` holds the last act's right edge to the column.
- Touch: the reserve did not reproduce. The Shell's tab bar is a sibling under the Place in the column (web `Shell`, native `Place` draws `ShellTabs` under its `Lifted` body), so a scrolled body ends above it. `behaviour/shell.stories.tsx` `BodyEndsAboveTheTabBar` (375 px Shell, a twelve-field Form over Save and Discard, scrolled to its end) holds the last act's bottom above the bar's top and passes; nothing was changed for it. If Stead's `page-edit-375-light` still shows the act under the bar, the page stands outside a Shell Place (a pushed Screen covers the tab bar by design) and the shot needs naming.
- The Save and Discard stack is left alone, by the ruling.
