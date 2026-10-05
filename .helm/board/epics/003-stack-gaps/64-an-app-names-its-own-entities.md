---
id: 003-64
status: backlog
sessions: {}
---
# api: an app names its own entities for reads and writes

## Goal
Stead's server keeps much of its state in git, not in database tables: repos, read hosts, memory notes, knowledge pages, a lead's cap, the usage reserve, quiet hours, the board's stories (github.com/fcalell/stead, packages/server/src). Their procedures cannot declare reads and writes, so a save never redraws the screens that read them (design/07-interface.md "Reads redraw in place").

## Approach
A procedure's Entity names come from `api.slots.entities`, which only plugins contribute (db's tables, auth's). `apiOptionsSchema` takes no entities, so an app cannot add a name; exporting placeholder tables from the schema or casting would be a workaround.

## Shape
`api({ entities: string[] })` is a new option: the names of state the app keeps outside any plugin's tables (git, files, a remote), contributed to `api.slots.entities` beside db's and auth's, so `reads` and `writes` type them. The value cannot be derived: deriving from procedure declarations removes the typo check the vocabulary exists for. It mirrors `api({ env })`.
`ENTITY_NAME_RE` moves from `procedure.ts` to `wire.ts` so the config parse and `assertValidEntityNames` share one pattern, and a bad name fails at `stack generate`. A name a plugin already declares is a `SlotConflictError` (the env rule); no warning for a declared name no procedure uses.
Server-side and type-level only: the wire headers and the client registry already carry any name as a string, so web and phone redraw with no client change. Guide pages `config.md` and `procedures.md`, `README.md` and `slot-catalog.md` follow. Typing the client helpers over `Entity` is filed as story 87.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.
