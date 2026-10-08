---
id: 003-199
status: backlog
sessions: {}
---
# api: a not-found read does not log an error in the browser console

## Goal
Stead's not-found states (a workflow, a run or a record opened by an address after it was removed) draw stack's not-found form from 003-42, a designed state, yet each one logs `log.error: Failed to load resource: the server responded with a status of 404 (Not Found)` in the console. Stead's interface review holds a no-console-error floor per page, which a designed state breaks (github.com/fcalell/stead, `packages/server/src/app/routes/system/` workflow and run routes; design/07-interface.md "Gaps"). Evidence: Stead's workflow canvas critique unit u11 at stack `74a0e3d`, Stead scratchpad `critique/u11/` (`outr.txt` line 13-14, `/rpc/workflows/get` for `stead/evening-round`; `out8.txt` line 764-765, `/rpc/runs/get` for `nonexistent`).

## Approach
A procedure's `ApiError("NOT_FOUND")` is answered with HTTP 404, and the browser prints every 404 fetch response as a console error before any code reads it; no handler in the app or in `QueryBoundary` can silence that message. 003-42 decoded the answer into the form but left the status, so the form and the console error come together. Unchanged at stack `HEAD` past `74a0e3d`.

## Acceptance criteria
- [ ] A read that answers not found draws the not-found form with no console error on web, the form unchanged.
- [ ] A real failure (a 500 or a refused connection) still logs and draws Retry.
- [ ] The `not-found` behaviour story passes with no console error.

## Open questions
- [ ] Its shape (the client's read answering not found in a body with a success status, an option on the procedure, or another): the stack session decides.

## Owner ruling
The owner ships the wire shape: a matched GET read that is not found answers 200 with the stack not-found header, and stack's client rebuilds the 404 before decoding. Non-stack clients and request logs see a 200; POSTs, 500s and unmatched routes are unchanged.
