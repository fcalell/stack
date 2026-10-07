---
id: 003-130
status: backlog
sessions: {}
---
# react-ui: a message input's box focuses its text on a press

## Goal
Stead's conversations and Now's ask box draw `MessageInput`, and on the desktop the text area is 426 x 20 inside a 64 px bordered box, so a press on the box's padding, its foot row or the gap under the text lands on nothing (github.com/fcalell/stead, `packages/server/src/app/ui/conversation.tsx`, `packages/server/src/app/ui/ask-box.tsx`; design/07-interface.md "Chats", the input). The target is 20 px high under the 24 floor, and the field reads as a field all the way to its edge. Evidence: chats critique unit u5, measured on Message Code at 1280 (Stead scratchpad `critique/u5/`, stack at `5564217`).

Touch: Now's ask box at 320 and 390 measures a 177 x 24 text area inside a 44 px box when empty (72 px with a draft), the same dead surface under the 44 floor (Stead scratchpad `critique/u1/shots/first-390-*`, `first-320-*`).

## Approach
The desktop box (`MESSAGE_INPUT_BOX` in ui-core/src/variants.ts, the `div` in plugins/react-ui/src/ui/components/message-input/index.tsx) carries the border, the focus ring (`BOX_FOCUS`) and the drop handlers, and focuses its text only for Send and Stop; no press handler on the box reaches the text area, and the text area is a single-line-high element that grows with its text. A `TextArea` and the other fields are labels or take the press on their whole box, so this is the one bordered field whose surface is mostly dead. The app cannot add a handler to the roster's box. Not 003-105 (the focus ring) and not 003-48 (paste and drop). Seen at stack `5564217`.

## Acceptance criteria
- [ ] A press anywhere in the desktop box that is not an act (the padding, the gap under the text, the foot row's empty part) puts focus in the text, with the caret at its end.
- [ ] A press on an act, a chip or its remove act does what it did.
- [ ] The MessageInput showcase holds the desktop box and the critique presses its edges.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the box takes the press or the text area fills the box's height.
