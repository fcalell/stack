---
id: 003-307
status: backlog
sessions: {}
---
# react-ui: a filled Thread's input spans the main

## Goal
In Stead's Chats the thread's input stands in a measure-wide column centred in the main. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "chatbox in the thread should be full width". The owner rules the input spans the main's width while the messages read at the measure from the main's start (with 003-308); Stead's `design/07-interface.md` ("Chats") now says so.

## Approach
`MessageInput` and the Thread's log both take `THREAD_COLUMN`, `w-full max-w-measure` (`packages/ui-core/src/variants.ts:739`; `plugins/react-ui/src/ui/components/message-input/index.tsx:109-111`, `thread/index.tsx:237`). 003-81 (done) and 003-163 (review) shape the column; neither spans the input. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] A Thread filling a Split's main docks its input across the main's width, within the page inset.
- [ ] Its messages keep the measure.
- [ ] An inline Thread is unchanged.

## Open questions
- [ ] Its shape (the filled form's default or an option): the stack session decides.
