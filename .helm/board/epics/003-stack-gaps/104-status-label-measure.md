---
id: 003-104
status: done
sessions: {}
---
# react-ui: a row's status label truncates with room to spare

## Goal
A ListRow's status label stops short on a wide row: System's Usage row ends its meta line "Watches paused for u…" with ~140 px free in the 440 px list (`rules-1440-light`, `system-1440-light`). Stead: `routes/system/*`. (The trailing age taking the title's width is story 83.)

Evidence, Stead repo screens critique unit u9 (Stead 948b7ec, stack 5564217; shots in Stead scratchpad critique/u9/shots/), ItemHeader status of a repo: the label is capped at max-width 129.6 px with an ellipsis, so "Fetched 28 seconds ago" truncates to "Fetched 28 seconds a…" while "Fetched 7 minutes ago" (122 px) fits, in a head with room to spare.

## Approach
`STATUS_LABEL` = `max-w-measure-short text-meta …` (variants.ts) caps the label by a fixed measure, so it truncates before the row's room runs out. The app passes only the words.

## Acceptance criteria
- [x] A status label uses the room its row has and truncates only when the meta line is out of room.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Built
`STATUS_LABEL` no longer carries `max-w-measure-short`: the word truncates only when the line it stands in is out of room, so ItemHeader's "Fetched 28 seconds ago" draws whole. A ListRow's status mark is no longer `shrink-0` (web `flex min-w-0`, native `shrink min-w-0`), so a status without a cap shares the overflow with the first part in proportion to their widths instead of pushing the line past the row. `apps/showcase/behaviour/row-meta.stories.tsx` `StatusRoom` asserts a long status draws whole in a 640 px row and truncates, with the row's children inside its box, at 320 px, and a `Status` alone draws whole.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/rows/report.md`).
