---
id: 003-09
status: done
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
- [x] Which of these become `Table` cell kinds and which become row marks: the stack session decides.

## Shape
Two more `ListRow` marks beside `status` and `chip`: `warning?: string` (a `TriangleAlert` glyph in `warn` with its label in meta ink) and `lock?: string` (a lock glyph, its label shown from `tablet`, read aloud always). The act that clears a warning is the row's `act` (003-10). `TableRowSlots` and `RowSlots` gain `warning` (and `RowSlots` `lock`); the count stays a meta part and the status a `status` column, so no new cell kinds. Meta-line order: status, warning, lock, chip; the chip and the lock label yield first.
