---
id: 003-307
status: review
sessions: {}
---
# react-ui: a filled Thread's input spans the main

## Goal
In Stead's Chats the thread's input stands in a measure-wide column centred in the main. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "chatbox in the thread should be full width". The owner rules the input spans the main's width while the messages read at the measure from the main's start (with 003-308); Stead's `design/07-interface.md` ("Chats") now says so.

## Approach
`MessageInput` and the Thread's log both take `THREAD_COLUMN`, `w-full max-w-measure` (`packages/ui-core/src/variants.ts:739`; `plugins/react-ui/src/ui/components/message-input/index.tsx:109-111`, `thread/index.tsx:237`). 003-81 (done) and 003-163 (review) shape the column; neither spans the input. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] A Thread filling a Split's main docks its input across the main's width, within the page inset.
- [x] Its messages keep the measure.
- [x] An inline Thread is unchanged.

## Open questions
- [x] Its shape (the filled form's default or an option): the stack session decides.

## Ruled
The filled form's default, no option: a Thread filling a Split's main docks its input across the main within the page inset (the foot already carries `px-page`), the messages keep the measure. The cap goes under the main's fill mark (`group/main`), so a Place-body Thread and an inline Thread read as before. A docked `Sheet` in the foot keeps its own measure column.

## Built
- `plugins/react-ui/src/ui/components/thread/fill.ts`: `INPUT_FILLED` (`max-w-none` under the main's mark). `thread/index.tsx` adds it to the foot's column; `message-input/index.tsx` adds it beside its `THREAD_COLUMN`.
- Evidence: `apps/showcase/behaviour/thread-fill.stories.tsx` `FilledThreadStandsAtStart1280` (input left and right edges at the log's inset) written, not run.
- Native unrendered: the phone's column is the screen's, so the input already spans.

Awaiting the batch browser run: the first acceptance box (measured at 1280) stays unticked.
