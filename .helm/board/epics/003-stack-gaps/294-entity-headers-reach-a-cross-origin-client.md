---
id: 003-294
status: backlog
sessions: {}
---
# plugin-api: the entity headers reach a cross-origin client

## Goal
The worker sends `x-stack-reads` and `x-stack-writes` on each answer, and `createClient`'s fetch wrapper reads them (`captureEntityHeaders`, `plugins/api/src/client.ts`) to know which entities a call read and wrote. The worker's `cors()` lists no `exposeHeaders` for them (`plugins/api/src/worker/index.ts`; 003-199 exposes only `x-stack-not-found`), so a browser hides both from a client on another origin and its reads go stale after a write. Found while building 003-199.

## Acceptance criteria
- [ ] A client on another origin reads `x-stack-reads` and `x-stack-writes`, so a write invalidates its reads as on the same origin.
- [ ] A same-origin client is unchanged.
- [ ] An api test holds the expose list to every header the client reads.

## Open questions
- [ ] Its shape (one exported list of the headers the client reads, from `wire.ts`, used by `cors()`): the stack session decides; a narrowing goes to the owner before the build.
