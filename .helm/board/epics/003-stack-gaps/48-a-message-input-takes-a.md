---
id: 003-48
status: backlog
sessions: {}
---
# ui-core: a message input takes a pasted or dropped file

## Goal
A pasted screenshot or a dropped file becomes an attachment, and an attachment chip carries the outside-content mark. The input of every session and thread. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`MessageInput`'s `onAttach` is the paperclip act alone: the text area has no paste or drop path, so a pasted screenshot is lost. An `Attachment` is an id and a name drawn as a neutral chip, with no thumbnail and no mark. Related: stack 003-17, a file control.

Reference: X's composer holds a file's thumbnail with its remove act ([screen](https://mobbin.com/screens/1449c0f8-2273-46e9-a846-3fa1430c0207)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
