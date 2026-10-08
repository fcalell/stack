---
id: 003-171
status: todo
sessions: {}
---
# react-ui, native-ui: the touch MessageInput field keeps room beside Attach, Stop and Send

## Goal
At 390 touch the Thread frame's `MessageInput` field measures 77 x 72 px (placeholder and notice wrap to three lines) in a 292 px frame, because Attach (44), Stop (44) and Send (about 69) share its row (scratchpad `critique/split/report.md`, `content-thread--rest`). Pre-existing, not from 003-81. A real phone gives about 358 px, so the field would stand near 140 px there.

## Approach
Ruled by the owner: at touch density Send is an icon act, as Stop already is, so the row holds three 44 px acts and the field keeps the rest of the row. Desktop keeps its labelled Send. Both platforms. The icon act carries its accessible name ("Send").

## Acceptance criteria
- [ ] The field is at least 120 px wide in a 292 px frame with Attach, Stop and Send drawn.
- [ ] Both platforms.
