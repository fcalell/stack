---
id: 003-87
status: done
sessions: {}
---
# api: the client's invalidateForWrites and meta.reads typed over Entity

## Goal
`invalidateForWrites(qc, writes)` and a query's `meta: { reads }` take plain strings. With story 64 a procedure's `reads` and `writes` are typed over `Entity`, but stead's `CHANGES` table (a socket frame to the entities it invalidates) and any non-API query's `meta.reads` can still hold a typo, and the screen then never redraws, on the web and on the phone.

## Approach
`.stack/procedure.ts` renders `type Entity` as the union of `api.slots.entities`. Export it from there (type-only, so the client bundle carries nothing) and make the query-invalidation helpers in `plugins/api/src/query-invalidation.ts` generic over it, with `procedure-codegen.ts` carrying the type to the client. It lands after story 64, which widens the union with the app's own names.

## Acceptance criteria
- [x] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Decided while building (2026-10-07), by the building session
The shape is a type registration, with no component, variant, token or option.
- `query-invalidation.ts` exports an empty `Register` interface and `EntityName` (the registered `entity`, else `string`). `invalidateForWrites`, the default one and a registry's, take `readonly EntityName[]`.
- `.stack/procedure.ts` exports `Entity` and merges `entity: Entity` into `Register` by module augmentation. Its `import type {}` of the module is required: an augmentation alone leaves the module out of the program (TS2664). The local name `Entity` must not equal the module's export, or the merge references itself (TS2502), hence `EntityName`.
- `.stack/worker.ts` re-exports `Entity` type-only. The app's program already loads `.stack/worker` for `AppRouter`, so the merge reaches the web and phone programs through the worker project's declarations, with no tsconfig change. Nothing is emitted at runtime.
- `tanstack-query.tsx` registers `queryMeta` on TanStack's `Register` (`{ reads?: readonly EntityName[] } & Record<string, unknown>`, verified against @tanstack/react-query 5.104), so a query's `meta.reads` is typed and other meta keys stay open. An app registering its own `queryMeta` would conflict.
- Proof: `plugins/api/test/entity-types.test.ts` (a typo fails and a valid name passes for both helpers and `meta.reads`, under `check-types`) and `test/entities.test.ts` (the rendered augmentation and re-export). A throwaway probe in the showcase app, against a generated `.stack/procedure.ts` with a union `Entity`, failed on the typo'd `invalidateForWrites` and `meta.reads` and passed the valid ones.
