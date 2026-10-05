---
id: 003-47
status: review
sessions: {}
---
# ui-core: the operator's message carries what came with it

## Goal
An operator's message shows its attached files or images and a provenance line ("by voice · Kitchen"). Every operator message in Chats that came from the room or carried an attachment. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`Message` for `you` takes plain text, a `name` read aloud and never drawn, and a time; it has no attachments and no line under the bubble but the time. `Prose` draws no images. Related: stack 003-31, an image that opens full size.

Reference: Claude web puts the attached image above the operator's bubble ([screen](https://mobbin.com/screens/17a974ca-aef7-4859-94fd-031d571f3904)); Manus ([screen](https://mobbin.com/screens/59dd33d5-6390-464e-a5b0-48ceced1b893)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Shape
`Message.attachments?: readonly Attachment[]` and `Message.meta?: Part[]` on `you` and `other`. Attachments stand above the bubble at the column's end: one with `src` (new `Attachment.src`) as an `Image` thumb (003-31), one without as a neutral chip of its name. `meta` is the provenance line ("by voice", "Kitchen") before the time under the bubble. The attachments row is one internal part shared with `MessageInput`, removable only there. 004-06's `message` map gains both fields.
