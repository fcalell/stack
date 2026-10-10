---
id: 003-308
status: backlog
sessions: {}
---
# react-ui: a filled Thread and its header stand at the main's start

## Goal
Stead's card thread on the board ("New story", `packages/server/src/app/routes/work/-components/card.tsx:615`) and its Chats threads centre their header and messages in the main, which reads badly against the left-aligned list beside it. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "split title (for example New story) looks bad centered, probably should align it left". The owner rules the header and the messages stand at the main's start; Stead's `design/07-interface.md` ("Chats") now says so.

## Approach
`COLUMN_FILLED` centres a filling Thread's column (`plugins/react-ui/src/ui/components/thread/fill.ts:20-21`, `mx-auto max-w-measure`), and `ItemHeader` takes it (`item-header/index.tsx:219`). 003-81 (done) kept the centring for a filling Thread on purpose; this reverses that half of it. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] A filled Thread's header and its messages start at the main's start, the messages at the measure, as a record in the main does (003-88).
- [ ] Its input follows 003-307.

## Open questions
- [ ] Its shape: the stack session decides.
