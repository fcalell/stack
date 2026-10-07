---
id: 003-104
status: backlog
sessions: {}
---
# react-ui: a row's status label truncates with room to spare

## Goal
A ListRow's status label stops short on a wide row: System's Usage row ends its meta line "Watches paused for u…" with ~140 px free in the 440 px list (`rules-1440-light`, `system-1440-light`). Stead: `routes/system/*`. (The trailing age taking the title's width is story 83.)

Evidence, Stead repo screens critique unit u9 (Stead 948b7ec, stack 5564217; shots in Stead scratchpad critique/u9/shots/), ItemHeader status of a repo: the label is capped at max-width 129.6 px with an ellipsis, so "Fetched 28 seconds ago" truncates to "Fetched 28 seconds a…" while "Fetched 7 minutes ago" (122 px) fits, in a head with room to spare.

## Approach
`STATUS_LABEL` = `max-w-measure-short text-meta …` (variants.ts) caps the label by a fixed measure, so it truncates before the row's room runs out. The app passes only the words.

## Acceptance criteria
- [ ] A status label uses the room its row has and truncates only when the meta line is out of room.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
