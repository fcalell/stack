---
id: 003-294
status: done
sessions: {}
---
# plugin-api: the entity headers reach a cross-origin client

## Goal
The worker sends `x-stack-reads` and `x-stack-writes` on each answer, and `createClient`'s fetch wrapper reads them (`captureEntityHeaders`, `plugins/api/src/client.ts`) to know which entities a call read and wrote. The worker's `cors()` lists no `exposeHeaders` for them (`plugins/api/src/worker/index.ts`; 003-199 exposes only `x-stack-not-found`), so a browser hides both from a client on another origin and its reads go stale after a write. Found while building 003-199.

## Acceptance criteria
- [x] A client on another origin reads `x-stack-reads` and `x-stack-writes`, so a write invalidates its reads as on the same origin.
- [x] A same-origin client is unchanged.
- [x] An api test holds the expose list to every header the client reads.

## Open questions
- [x] Its shape (one exported list of the headers the client reads, from `wire.ts`, used by `cors()`): the stack session decides; a narrowing goes to the owner before the build.

## Owner ruling
One list from `wire.ts`: `STACK_EXPOSED_HEADERS = [STACK_READS_HEADER, STACK_WRITES_HEADER, STACK_NOT_FOUND_HEADER] as const`, import-free like the rest of the file. `worker/index.ts` passes `cors({ exposeHeaders: [...STACK_EXPOSED_HEADERS] })` in place of `[STACK_NOT_FOUND_HEADER]`. The api test holds every `STACK_*_HEADER` export of `wire.ts` to the list, and a cross-origin answer from an allowed origin to name all three; same-origin unchanged.

## Ruled
Built to the ruling as written.

## Built
`STACK_EXPOSED_HEADERS` in `plugins/api/src/wire.ts` lists the three headers the client reads; `plugins/api/src/worker/index.ts` hands it to `cors({ exposeHeaders })`, so a browser on another origin reads `x-stack-reads` and `x-stack-writes` as well as `x-stack-not-found`. `plugins/api/test/exposed-headers.test.ts` holds three things: every `STACK_*_HEADER` the wire exports is in the list (a header added to `wire.ts` fails the test until it joins), a request from an allowed origin answers `Access-Control-Expose-Headers` naming all three, and a request with no `Origin` carries no CORS header. The test passes under `node --test`.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. No critique unit this round; the behaviour and screens suites hold it.
