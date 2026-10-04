---
id: 005-08
status: review
sessions: {}
---
# react-ui, native-ui: a decision's sheet keeps its content until it has left

## Goal
`Confirmations` mirrors the queue's `current` into `shown` through an effect (web
`components/sheet/confirm.tsx:70-73`, phone `sheet/confirm.tsx:82-85`), so the first `confirm()`
renders nothing, then mounts the sheet a commit later. On the web, dismissing decision A while B
waits shows A's content in the open sheet for a painted frame, and A never plays its exit;
`ConfirmSheet` is unkeyed, so B's name field opens holding A's typed name. `if (!open)
setTyped("")` (web `:35-37`, phone `:44-46`) clears the field as the sheet starts leaving: the
name empties on screen, and the act flips back to blocked mid-exit. `SheetBase` resets `touched`
the same way (web `sheet/base.tsx:124-126`, phone `sheet/base.tsx:411-418`), so the head's
Reason vanishes and the sheet shifts while it leaves.

## Approach
Per-decision state resets when a new decision arrives, never when the sheet starts closing.
`Confirmations` derives `shown` in render (the last non-empty entry, `open={current !==
undefined}`), with no effect. `ConfirmSheet` clears `typed` and `pending` during render when the
entry's id changes; it stays unkeyed, so a queued second decision does not remount a sheet that
is still open. `SheetBase` resets `touched` on open, as it already resets a wizard page during
render.

Decided (the recommended answer, applied 2026-10-04): the reset is per decision id at render, with `ConfirmSheet` unkeyed, so a queued second decision never remounts an open sheet.

## Acceptance criteria
- [ ] (live) web, members' remove (a name-confirm) at 375: after Delete, the field keeps the typed name and the act its look until the sheet is gone; with two decisions queued, the second opens empty.
- [ ] (live) phone, on the harness: the Notes `confirm()` opens in the first commit after the call, and its content holds through the slide-out.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Web live: a typed confirm keeps its text and its act's look through the whole exit (Cancel and Escape), and a queued second decision opens on the first frame with an empty field, at 375 and 1440. SheetBase also resets on a new page (an unkeyed confirm stays open from one decision to the next). Open: the phone live criterion on the harness.
