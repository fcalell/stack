---
id: 003-87
status: backlog
sessions: {}
---
# api: the client's invalidateForWrites and meta.reads typed over Entity

## Goal
`invalidateForWrites(qc, writes)` and a query's `meta: { reads }` take plain strings. With story 64 a procedure's `reads` and `writes` are typed over `Entity`, but stead's `CHANGES` table (a socket frame to the entities it invalidates) and any non-API query's `meta.reads` can still hold a typo, and the screen then never redraws, on the web and on the phone.

## Approach
`.stack/procedure.ts` renders `type Entity` as the union of `api.slots.entities`. Export it from there (type-only, so the client bundle carries nothing) and make the query-invalidation helpers in `plugins/api/src/query-invalidation.ts` generic over it, with `procedure-codegen.ts` carrying the type to the client. It lands after story 64, which widens the union with the app's own names.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
