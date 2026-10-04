---
id: 003-59
status: done
sessions: {}
---
# plugin-db: the phone app's worker test never stalls or is cancelled under a loaded check

## Goal
`apps/phone/src/worker/routes/notes.test.ts` failed twice in `pnpm check` on 2026-10-04 and
passed on rerun: once it stalled a full check for 15 minutes (before 18:29), once it was
cancelled with "Promise resolution is still pending but the event loop has already resolved"
(after 20:24). Neither reproduced in 395 runs under CPU load, concurrent copies, forced full
test graphs and `dist` rebuilds.

Every D1 call in the test boot crosses miniflare's proxy, and `prepare` crosses it
synchronously: the main thread blocks in `Atomics.wait` on a worker thread whose undici Pool has
`headersTimeout: 0` and `bodyTimeout: 0`, so a sync op workerd never answers blocks the process
with no timeout, which fits the stall. Commit 3fae724 (20:24) patched miniflare's connections
(reuse and a 1 s client-side keep-alive); the stall predates it, the cancellation does not.

## Approach
Decided by fcalell (2026-10-04): the test boot serves its D1 from an in-process sqlite (`node:sqlite`) behind
the D1 interface drizzle uses, with the same migrations and `d1_migrations` records, which
removes the proxy, the sync worker thread and the sockets. This reverses fc9da29's choice of miniflare's D1 for
fidelity in the test boot only; `stack dev` and deploys keep the real D1.

## Acceptance criteria
- [x] (test) the phone worker's tests pass 200 runs in a loaded full check with no stall or cancellation.

## Progress
Built; `pnpm check` and `pnpm verify` pass, and the criterion holds: 200 of 200 phone worker test runs passed beside 47 forced back-to-back check-types and test runs, no stall or cancellation (1 to 6 s each). The test boot's D1 is an in-memory `node:sqlite` behind the D1 calls drizzle uses; the miniflare patch, whose only purpose was the test boot's connections, is removed, so `stack dev` runs stock miniflare.
