---
id: 003-171
status: review
sessions: {}
---
# react-ui, native-ui: the touch MessageInput field keeps room beside Attach, Stop and Send

## Goal
At 390 touch the Thread frame's `MessageInput` field measures 77 x 72 px (placeholder and notice wrap to three lines) in a 292 px frame, because Attach (44), Stop (44) and Send (about 69) share its row (scratchpad `critique/split/report.md`, `content-thread--rest`). Pre-existing, not from 003-81. A real phone gives about 358 px, so the field would stand near 140 px there.

## Approach
Ruled by the owner: at touch density Send is an icon act, as Stop already is, so the row holds three 44 px acts and the field keeps the rest of the row. Desktop keeps its labelled Send. Both platforms. The icon act carries its accessible name ("Send").

## Acceptance criteria
- [x] The field is at least 120 px wide in a 292 px frame with Attach, Stop and Send drawn.
- [ ] Both platforms.

## Built
On touch Send is an icon act (`Send` glyph, `IconButtonBase` at the bar fit, named "Send"), as Stop is, in `plugins/react-ui/src/ui/components/message-input/index.tsx` (chosen by `useTouch()`, like Stop) and `plugins/native-ui/src/ui/components/message-input/index.tsx`; the desktop keeps its labelled Send. Rules text in both guides, `ui-core.md` and the `MESSAGE_INPUT` and roster comments say it. Story `FieldKeepsRoomAtANarrowPhone` (`apps/showcase/behaviour/message-input.stories.tsx`): at 292 px with Attach, Stop and Send drawn, the three acts have one width and the field is at least 120 px wide. The scoped stories run passes (36 files, 179 tests). The phone render is unchecked on a device.
Native unrendered: Both platforms.
