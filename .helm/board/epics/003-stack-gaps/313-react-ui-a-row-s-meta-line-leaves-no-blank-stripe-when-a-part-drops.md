---
id: 003-313
status: review
sessions: {}
---
# react-ui: a row's meta line leaves no blank stripe when a part drops

## Goal
At 440 px the long status form fits by dropping `· main` whole, leaving a blank stripe of about 32 px before the status dot.

Found by the critique of 003-208.

## Owner ruling
Ruling (b): revert to the aligned status column and accept the bounded stripe. The first reading (no gap wider than the gap step where a part dropped) conflicts with the aligned status column; the column wins (rules.md keeps every row's trailing value ending at one x). The blank before the status is the same blank any short first part leaves, and `figures` bounds it.

## Acceptance criteria
- [x] A row's status stands at the meta line's end whether or not a later part drops, so in one list its right edge is the same x on every row (touch as well).
- [x] The room a dropped part leaves (the blank before the status beyond the line's gap step) is narrower than the later parts' `figures` minimum (`basis-figures`): a wider room never opens, because a part that would leave a wider one shows instead.
- [x] The status word is never clipped, as today.

## Ruled
The first build stopped the parts' box growing while the later parts were dropped, so the marks followed the first part. The owner ruled against it (above): it broke the aligned status column. It is reverted; no new surface, no ui-core value changes.

## Built (rework)
Ruling (b) applied. `useDropped` (`lib/dropped.ts`), the `dropped`/`marks` locals, `META_PARTS_DROPPED`, `LATER_DROPPED` and the `grow-0` safelist entry are gone (nothing else used `grow-0`); the parts' box grows into the room the marks leave again, so the status stands at the line's end. `rules.md` (list-row text) and `ui-core.md` say the status stands at the line's end and a dropped part's room falls before it, under `figures`.
Story `list-row-status` (`MetaDrops`, `MetaDropsTouch`, 14 remotes at 440, 390 and 320): every row's status right edge within 1 px, status word whole, at least one row drops per width, and on a dropped row (status left less the first part's ink right less the line's gap step) is under the resolved `figures`. Widest room measured: pointer 31.3 / 28.3 / 29.9 px at 440 / 390 / 320 against `figures` 32; touch 34.9 / 34.9 / 31.0 against 36. Chromium: `list-row-status`, `row-meta`, `list`, `list-acts`, `waiting`, `place` pass (79 tests). Native unaffected.
