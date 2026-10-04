---
id: 003-59
status: backlog
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
- [ ] (test) the phone worker's tests pass 200 runs in a loaded full check with no stall or cancellation.
