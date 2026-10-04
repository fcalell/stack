---
id: 004-01
status: backlog
sessions: {}
---
# ui-core: classify the roster as collections or composition

## Goal
Every roster component is classed as a collection (one item shape repeated over data) or
composition (distinct authored parts), on both platforms, so each collection gets a story.

## Approach
Read `packages/ui-core/src/roster.ts` and each component's props on web and phone. A mixed case
(e.g. `Group`) is decided by its use: static mixed rows are composition, a query-bound set is a
`List` in that look.

## Acceptance criteria
- [ ] (file) one story per collection under this epic, each naming its item slots.
