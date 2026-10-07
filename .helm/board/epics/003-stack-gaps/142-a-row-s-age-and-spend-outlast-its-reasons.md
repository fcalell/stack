---
id: 003-142
status: backlog
sessions: {}
---
# react-ui: a row's age and spend are the last meta parts to be cut

## Goal
Stead's Work rows read "implementing · pass 1 · “Sign-in from a second de…", "blocked by “Sync the shelf between devices” · 8 …", "waiting for usage · resumes 10:43 PM · round 1 · 8…" and, at 320 px, "refining · round 3 · 3 open flags · 7…": the age and the spend are what the cut takes first (github.com/fcalell/stead, `packages/server/src/app/routes/work/-components/board.tsx` lines 128 to 137; design/07-interface.md "A row's meta": the stage or reason, age and spend always readable). Evidence: critique unit u6, shots `list-1440-light`, `done-expanded-1440-light`, `list-320-dark` (Stead scratchpad `critique/u6/shots/`, stack at `5564217`).

## Approach
ListRow's meta line truncates "the later parts first" (`LATER`, `LATER_TEXT` in list-row/index.tsx), so whatever the app puts last is cut first; the app can order its parts, but then the quoted epic or a long reason is the part that is cut, and the one `LATER` slot shows "at least `figures` of it or none" with no way to say which later part is the one that must read. Not 003-118 (the status against the first part) and not 003-83 (the trailing age against the title): here the line holds a first part, a status, a quote and an age and spend, and the order of yield between the later parts is what is in question. Seen at stack `5564217`.

## Acceptance criteria
- [ ] A meta line too narrow for its parts cuts a part the app marks as the yielding one (a quote, a reason) before the age and spend, which read whole while the line is wide enough for them alone.
- [ ] The ListRow showcase holds a row with a long quote, an age and a spend at 320 px.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether a `Part` can say it yields, or the later parts yield in reverse order.
