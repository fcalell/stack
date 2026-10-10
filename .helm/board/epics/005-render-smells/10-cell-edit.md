---
id: 005-10
status: review
sessions: {}
---
# ui-core, react-ui, native-ui: a cell edit starts, cancels and ends by event, not by frame

## Goal
Escape in an edit puts the value back through the parent (`moment.cancel`), then blurs a frame
later so `leave` sees the restored value: phone `components/input/index.tsx:165-171`, web
`table/index.tsx:473-476`. `cancel` leaves `atFocus` set (`packages/ui-core/src/commit.ts:35-37`),
so a parent slower than a frame commits the stale typed value. The web Table also focuses a new
edit's input a frame after start (`:381-386`), and on `done()` waits two frames then reads
`document.activeElement` to guess whether the Picker released focus (`:415-429`). The `opened`
counter (`:380`, read per cell `:535`) carries "open now" as state, re-rendering the grid per edit,
and the web Picker turns it into `open` through an effect (`picker/base.tsx:267-273`), painting a
frame with the list closed.

## Approach
`cancel` ends the moment: it clears `atFocus`, so a following `leave` commits nothing, and both
platforms blur at once. The edit control focuses itself on mount; Escape, Enter and the Picker's
close end the edit and refocus the cell in their own handlers. The editing cell's Picker mounts
open, so no counter crosses the grid. No `requestAnimationFrame` stays in the edit path.

## Acceptance criteria
- [x] (test) `commitMoment`: `cancel` then `leave` with the typed value commits nothing.
- [ ] (live) web, members' table at 1440: Escape restores the value and refocuses the cell under 6x CPU throttle; a role cell's list is open in the edit's first frame.
- [ ] (live) phone, on the harness: Escape in a cell edit commits nothing.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Escape now leaves every typing control with `onCommit`. The web timing criterion (Escape under a 6x CPU throttle, the role cell's list open in the edit's first frame) is not run. Open: the phone live criterion; the touch PickSheet's focus return is read from Base UI, not measured.
Open: the timing criteria wait for the live critique.

## Critique
Partial: every state the story feeds renders correctly; its timing criteria (throttled Escape, copy timing, the clock past `until`) were not driven.

## Review
Rework, not accepted. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique partial: the story's timing criteria (throttled Escape) were never driven; a CPU throttle proves nothing about timing. The web timing box stays open; the phone box stays open.

## Owner ruling
The owner rules rework: prove timing in behaviour stories with a test clock, not a CPU throttle. Web: Escape with a parent whose commit resolves after 100 ms leaves the old value (commit called 0 times) and focus on the cell; the role cell's list is open in the edit's first rendered state (no closed-list frame). The web box ticks on a pass; the phone box stays open.
