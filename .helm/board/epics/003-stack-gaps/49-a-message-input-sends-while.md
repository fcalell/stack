---
id: 003-49
status: review
sessions: {}
---
# ui-core: a message input sends while an answer streams

## Goal
While a lead's turn runs, the operator writes and sends a message that the lead reads at its next turn, with Stop still at hand, and the input says so under itself ("Delivered at Code's next turn."). The input of every thread and session, and Now's ask box. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
A working `MessageInput` puts Stop in Send's place and holds `sendable` false, so neither Enter nor a button sends until the answer ends; the text stays open and is kept. Its `notice` can carry the sentence, but nothing sends to need it.

Reference: Manus keeps its input live under a running task and says what it is doing there ([screen](https://mobbin.com/screens/59dd33d5-6390-464e-a5b0-48ceced1b893)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Progress
Shape: no prop; while `working`, Stop stands before Send and Send stays live. On touch Stop is an icon act, so the field narrows by one compact square while an answer runs. Built on web and phone; `pnpm check` and `pnpm verify` pass. Open: the live check (web per batch, phone on the harness).
The web design critique's findings are fixed and measured at 1440 and 375 (light).
