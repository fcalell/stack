---
id: 003-308
status: review
sessions: {}
---
# react-ui: a filled Thread and its header stand at the main's start

## Goal
Stead's card thread on the board ("New story", `packages/server/src/app/routes/work/-components/card.tsx:615`) and its Chats threads centre their header and messages in the main, which reads badly against the left-aligned list beside it. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "split title (for example New story) looks bad centered, probably should align it left". The owner rules the header and the messages stand at the main's start; Stead's `design/07-interface.md` ("Chats") now says so.

## Approach
`COLUMN_FILLED` centres a filling Thread's column (`plugins/react-ui/src/ui/components/thread/fill.ts:20-21`, `mx-auto max-w-measure`), and `ItemHeader` takes it (`item-header/index.tsx:219`). 003-81 (done) kept the centring for a filling Thread on purpose; this reverses that half of it. Seen at stack `226f48c`.

## Acceptance criteria
- [x] A filled Thread's header and its messages start at the main's start, the messages at the measure, as a record in the main does (003-88).
- [ ] Its input follows 003-307.

## Open questions
- [x] Its shape: the stack session decides.

## Ruled
Both halves follow the main's mark: `COLUMN_FILLED` loses `mx-auto` (the header stands in `THREAD_COLUMN` at the main's start, at the page inset its part-above margin gives), and the log under the mark stands its column at the start (`LOG_AT_START`, `items-start` over `items-center`). A Place-body Thread keeps the centring.

## Built
- `thread/fill.ts`: `COLUMN_FILLED` without `mx-auto`, `LOG_AT_START`; `thread/index.tsx` applies it to the log. `plugins/react-ui/scripts/overlays.ts` allowlist updated; `test/fill.test.ts` holds the header to `THREAD_COLUMN`.
- Docs: both rules pages, `ui-core.md`, the Thread doc comment.
- Evidence: `FilledThreadStandsAtStart1280` (header and messages at one left edge, messages no wider than the measure) written, not run.
- Native unrendered: the phone has no centred column.

Awaiting the batch browser run: the first acceptance box stays unticked.

## Browser run
`FilledThreadStandsAtStart1280` passes (thread-fill.stories.tsx, 1 of 1): the item header and every message share one left edge at the log's inset plus the page inset, each message no wider than the measure.
