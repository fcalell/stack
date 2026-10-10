---
id: 003-214
status: done
sessions: {}
---
# react-ui: a reply that is still streaming does not draw its unclosed Markdown marker as text

## Goal
Stead's conversation streams the lead's reply into the log as it arrives (github.com/fcalell/stead, `packages/server/src/app/ui/conversation.tsx`, `linesOf` at line 331: the streamed text is the `body` of an `other` line; design/07-interface.md "### Chats", the Reply row: "prose on the canvas, unbubbled, outcome first, streaming"). Between the opening emphasis marker and its closing one the reply draws the half-open marker as words ("*Sign"), and the text changes shape when the closing marker arrives. The same holds for an opened `**`, a backtick, a link's `[` and a fence. Evidence: Stead's second Chats critique, unit u5 at stack `74a0e3d` (the critic's observation of a streamed reply, Stead scratchpad `critique/u5/`).

## Approach
A `Message` of the `other` author draws its `body` as markdown through `Prose`, which lexes the whole text with `marked` (`prose/index.tsx`); per CommonMark a marker with no closer is text, which is right for a finished reply and wrong for one whose closer has not arrived. Nothing in `Message`, `Thread` or `Prose` says the text is still growing (no `streaming` prop beside `loading`, which draws bars for a reply that has not begun). The app cannot correct the text it hands over without a wrapper that closes markers before `Message` lexes them, which is stack's job to know (the lexer is stack's, the rules for what an open run draws are Prose's). Unchanged at stack `HEAD` past `74a0e3d` (no commit touches `prose` or `message` for it).

## Acceptance criteria
- [x] A reply marked as still arriving draws an unclosed emphasis, strong, code span or link run in its own form from its first character, and the closing marker changes nothing already drawn, on both platforms.
- [x] A finished reply, and a `Message` that is not marked, read as before (an unmatched marker stays text).
- [x] The Message or Thread showcase holds a reply streamed through an open marker, measured at 390 and 1280 by the critique.

## Open questions
- [x] Its shape (a `streaming` flag on the `other` message, a Prose prop, or the lexer completing a trailing run on its own): the stack session decides.

## Ruled
A `streaming` flag on the `other` `Message` (and a Thread `message` slot of the same name), not a Prose prop and not a lexer that completes on its own (that would change finished replies). `Message` hands `Prose` the text through `closeOpenRuns`, so `Prose` and its lexer are untouched.

## Built
- `packages/ui-core/src/streaming.ts` (`@fcalell/ui-core/streaming`, framework-free, tested in `test/streaming.test.ts`): closes an open fence, emphasis, strong, strike, code span, link text (`]()`) and link target (`)`) at the text's end, in the last paragraph only; a marker no text follows, a spaced marker, snake_case and an escaped marker stay text; closed text is a fixed point.
- `Message` (react-ui, native-ui): `streaming` prop (roster entry; `author: "other"` only, `never` on a system line); `Thread` `message.streaming` slot on both.
- Docs: both rules pages, `ui-core.md`, `ui-core/README.md`; `DESIGN.md` regenerated; `verify` passes in ui-core, react-ui, native-ui.
- Evidence: `apps/showcase/behaviour/message-streaming.stories.tsx` (open strong, em and code span drawn; a finished reply keeps its `*`) written, not run; the showcase criterion (measured at 390 and 1280 by the critique) stays for the batch.
- Native unrendered: same function through `Prose`.

## Owner ruling
The owner rules the closing-marker clause ("the closing marker changes nothing already drawn") covered by the unit test, as a story has no arriving-text control to render it.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique pass: an open strong, em or code run is drawn in its form while streaming; a finished reply keeps a stray `*` as text. The closing-marker criterion is covered by the unit test (owner ruling above); a story has no arriving-text control to render it.
