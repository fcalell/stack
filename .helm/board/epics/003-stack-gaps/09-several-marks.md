---
id: 003-09
status: backlog
sessions: {}
---
# ui-core: a row carries several marks

## Goal
A Martechthings change set entry carries its change chip, a warn mark (stale, name conflict) with the act that clears it, the lock it holds, its implementation items as a count, and its test status as a dot. `ListRow` carries one `status` and one `chip`. A `Table` may hold them as columns, but a warn mark with its own act inside a cell is not drawn today.

## Approach
- References: Front's merge review, a warning glyph on the conflicting field with its fix in place ([screen](https://mobbin.com/screens/0ecf2195-42d2-4db8-a7c4-46a176759c17)); Jira's unsaved changes table, a kind tag plus "+5 fields" per row ([screen](https://mobbin.com/screens/29e2f1b6-8fb3-434a-9714-1a21e2440393)).

## Acceptance criteria
- [ ] A row (in a `Table` or a list) carries a change chip, a warn mark with its act, a lock, a count and a status dot together, legible at desktop density.

## Open questions
- [ ] Which of these become `Table` cell kinds and which become row marks: the stack session decides.
