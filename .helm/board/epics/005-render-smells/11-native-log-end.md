---
id: 005-11
status: backlog
sessions: {}
---
# native-ui: a Thread's log starts at its end

## Goal
The phone log is a plain `ScrollView` that mounts at offset 0, and `follow()` scrolls to the end
from `onContentSizeChange` and `onLayout` (`components/thread/index.tsx:201-203`, `:234-235`),
which fire after the native layout pass. A long conversation shows its oldest messages for a
frame, then jumps; each keyboard open or close does the same through `KeyboardAvoidingView`'s
padding. `atEnd` is a ref only `onScroll` updates (`:236-244`), so after a layout shrink it holds
a value that is right by luck. RN 0.85's `maintainVisibleContentPosition` has no bottom form.

## Approach
The log's origin is its end: an inverted list over the messages reversed, or a reversed content
container, so the newest message is at offset 0 and a keyboard resize keeps the bottom anchored.
`follow()`, `onContentSizeChange` and the `atEnd` ref go; the Latest act (`away`, `:192`,
`:213-218`) reads the offset from the start. The log stays a polite live region and keeps 004-06's
four states.

## Acceptance criteria
- [ ] (live) on the harness, the conversation 03 adds to `apps/phone`, at 40 messages: the first frame shows the newest message, and opening the keyboard moves no message off the bottom for a frame, at 390 dp.
