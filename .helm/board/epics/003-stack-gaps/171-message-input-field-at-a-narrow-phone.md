---
id: 003-171
status: backlog
sessions: {}
---
# react-ui, native-ui: the touch MessageInput field keeps room beside Attach, Stop and Send

## Goal
At 390 touch the Thread frame's `MessageInput` field measures 77 x 72 px (placeholder and notice wrap to three lines) in a 292 px frame, because Attach (44), Stop (44) and Send (about 69) share its row (scratchpad `critique/split/report.md`, `content-thread--rest`). Pre-existing, not from 003-81. A real phone gives about 358 px, so the field would stand near 140 px there.

## Approach
Open question for the owner. Recommended answer: on touch Send is an icon act as Stop already is, so the row holds three 44 px acts and the field keeps 292 - 3 x 44 - gaps. The other answer is to stack the acts under the field below a width. Both change the look, so it waits for a ruling.

## Acceptance criteria
- [ ] The field is at least 120 px wide in a 292 px frame with Attach, Stop and Send drawn.
- [ ] Both platforms.
