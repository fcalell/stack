---
id: 003-214
status: backlog
sessions: {}
---
# react-ui: a reply that is still streaming does not draw its unclosed Markdown marker as text

## Goal
Stead's conversation streams the lead's reply into the log as it arrives (github.com/fcalell/stead, `packages/server/src/app/ui/conversation.tsx`, `linesOf` at line 331: the streamed text is the `body` of an `other` line; design/07-interface.md "### Chats", the Reply row: "prose on the canvas, unbubbled, outcome first, streaming"). Between the opening emphasis marker and its closing one the reply draws the half-open marker as words ("*Sign"), and the text changes shape when the closing marker arrives. The same holds for an opened `**`, a backtick, a link's `[` and a fence. Evidence: Stead's second Chats critique, unit u5 at stack `74a0e3d` (the critic's observation of a streamed reply, Stead scratchpad `critique/u5/`).

## Approach
A `Message` of the `other` author draws its `body` as markdown through `Prose`, which lexes the whole text with `marked` (`prose/index.tsx`); per CommonMark a marker with no closer is text, which is right for a finished reply and wrong for one whose closer has not arrived. Nothing in `Message`, `Thread` or `Prose` says the text is still growing (no `streaming` prop beside `loading`, which draws bars for a reply that has not begun). The app cannot correct the text it hands over without a wrapper that closes markers before `Message` lexes them, which is stack's job to know (the lexer is stack's, the rules for what an open run draws are Prose's). Unchanged at stack `HEAD` past `74a0e3d` (no commit touches `prose` or `message` for it).

## Acceptance criteria
- [ ] A reply marked as still arriving draws an unclosed emphasis, strong, code span or link run in its own form from its first character, and the closing marker changes nothing already drawn, on both platforms.
- [ ] A finished reply, and a `Message` that is not marked, read as before (an unmatched marker stays text).
- [ ] The Message or Thread showcase holds a reply streamed through an open marker, measured at 390 and 1280 by the critique.

## Open questions
- [ ] Its shape (a `streaming` flag on the `other` message, a Prose prop, or the lexer completing a trailing run on its own): the stack session decides.
