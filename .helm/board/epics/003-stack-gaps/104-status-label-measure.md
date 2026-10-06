---
id: 003-104
status: backlog
sessions: {}
---
# react-ui: a row's status label truncates with room to spare

## Goal
A ListRow's status label stops short on a wide row: System's Usage row ends its meta line "Watches paused for u…" with ~140 px free in the 440 px list (`rules-1440-light`, `system-1440-light`). Stead: `routes/system/*`. (The trailing age taking the title's width is story 83.)

## Approach
`STATUS_LABEL` = `max-w-measure-short text-meta …` (variants.ts) caps the label by a fixed measure, so it truncates before the row's room runs out. The app passes only the words.

## Acceptance criteria
- [ ] A status label uses the room its row has and truncates only when the meta line is out of room.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
