---
id: 003-197
status: backlog
sessions: {}
---
# react-ui: a Thread ends on a waiting message while a reply is on its way

## Goal
Stead's conversation draws a working turn as a loading `Message`, the log's last entry, while the lead works and nothing has streamed yet (design/07-interface.md "### Chats", the Working row: "a loading `Message` as the log's last entry, and the input's working form with Stop before Send", as Linear's thinking is). Today the log ends on the operator's own message, so between the send and the first streamed word nothing in the log says a reply is coming (github.com/fcalell/stead, `packages/server/src/app/ui/conversation.tsx`, `linesOf` at line 276). Evidence: Stead's Chats critique unit u5 at stack `74a0e3d` (Stead scratchpad `critique/u5/report.md`).

## Approach
`Message` takes `loading`, but a `Thread` draws its items through `MessageSlots`, which has no per-item loading slot, and its item renderer never passes `loading` to `Message` (`plugins/react-ui/src/ui/components/thread/index.tsx`). The only waiting form is the Thread's own `loading`, which turns the whole log into three waiting messages, the form for a log still on its way, not one reply. A `<Message loading>` the app stands beside the `Thread` sits outside the scrolling log and breaks the Thread's fill (it must be the region's direct child, 003-163). Unchanged at stack `HEAD` past `74a0e3d`.

## Acceptance criteria
- [ ] A loaded `Thread` can end on one waiting message from the other author, inside its log, followed and pinned to as a new message is, and replaced in place by the reply when it streams.
- [ ] A Thread with no waiting entry is unchanged; the Thread's own `loading` keeps its three-message form.
- [ ] The Thread showcase holds a log ending on a waiting reply at 390 and 1280, measured by the critique.

## Open questions
- [ ] Its shape (a `loading` slot on `MessageSlots`, a Thread prop for a pending reply, or another): the stack session decides.
