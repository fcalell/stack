---
id: 003-199
status: done
sessions: {}
---
# api: a not-found read does not log an error in the browser console

## Goal
Stead's not-found states (a workflow, a run or a record opened by an address after it was removed) draw stack's not-found form from 003-42, a designed state, yet each one logs `log.error: Failed to load resource: the server responded with a status of 404 (Not Found)` in the console. Stead's interface review holds a no-console-error floor per page, which a designed state breaks (github.com/fcalell/stead, `packages/server/src/app/routes/system/` workflow and run routes; design/07-interface.md "Gaps"). Evidence: Stead's workflow canvas critique unit u11 at stack `74a0e3d`, Stead scratchpad `critique/u11/` (`outr.txt` line 13-14, `/rpc/workflows/get` for `stead/evening-round`; `out8.txt` line 764-765, `/rpc/runs/get` for `nonexistent`).

## Approach
A procedure's `ApiError("NOT_FOUND")` is answered with HTTP 404, and the browser prints every 404 fetch response as a console error before any code reads it; no handler in the app or in `QueryBoundary` can silence that message. 003-42 decoded the answer into the form but left the status, so the form and the console error come together. Unchanged at stack `HEAD` past `74a0e3d`.

## Acceptance criteria
- [x] A read that answers not found draws the not-found form with no console error on web, the form unchanged.
- [x] A real failure (a 500 or a refused connection) still logs and draws Retry.
- [x] The `not-found` behaviour story passes with no console error.

## Open questions
- [x] Its shape (the client's read answering not found in a body with a success status, an option on the procedure, or another): the stack session decides.

## Owner ruling
The owner ships the wire shape: a matched GET read that is not found answers 200 with the stack not-found header, and stack's client rebuilds the 404 before decoding. Non-stack clients and request logs see a 200; POSTs, 500s and unmatched routes are unchanged.

## Ruled
A matched GET read whose oRPC answer is 404 leaves the worker as a 200 carrying `x-stack-not-found: 1` (the error JSON body unchanged), and `createClient`'s fetch wrapper rebuilds the 404 from that header before oRPC decodes it. POSTs, 500s and unmatched routes are untouched. No option, no consumer surface.

## Built
- `plugins/api/src/wire.ts`: `STACK_NOT_FOUND_HEADER`, import-free with the two entity headers.
- `plugins/api/src/worker/index.ts`: the matched branch answers a GET 404 as 200 plus the header; the Hono `cors()` config gains `exposeHeaders: [STACK_NOT_FOUND_HEADER]`.
- `plugins/api/src/client.ts`: after `captureEntityHeaders`, a response with the header is returned as `new Response(body, { status: 404, statusText: "Not Found", headers })`. oRPC decodes an error from the response status, so `isNotFound`, `QueryBoundary` and the Missing form are unchanged.
- `plugins/api/guide/client.md`, `procedures.md`: one sentence each on the wire.
- Evidence: `plugins/api/test/not-found-read.test.ts` passes under `pnpm check` (the worker's 200 plus header for a GET read, 404 for a POST, a 500 and an unmatched route untouched, the CORS expose header, the client over the worker rejecting with an error `isNotFound` accepts, a failed read not a not found). The `Read` and `Failure` stories in `apps/showcase/behaviour/not-found.stories.tsx` pass (4 tests in the file, peak 1511 MiB): `Read` draws the Missing form through `createClient` over a fetch answering 200 plus the header, with no Retry and no `console.error`; `Failure` (a 500) draws the failed form and Retry reads again.
- Real network: the showcase's own worker under `wrangler dev` (assets and `/rpc` on one origin) and headless Chromium open `/deploys/zzz`, a deploy `deploys.get` answers not found, reading every console message through `page.on("console")`. On master's worker the browser logs `Failed to load resource: the server responded with a status of 404 (Not Found)` for `/rpc/deploys/get` (twice, one per request) and draws the Missing form. With this change `/rpc/deploys/get` answers 200 with `x-stack-not-found: 1`, the console holds no message at all, and the Missing form is drawn with no Retry.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. No critique unit this round; the behaviour and screens suites hold it.
