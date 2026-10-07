---
id: 003-135
status: backlog
sessions: {}
---
# react-ui: a Thread whose first entry is a system line keeps the log's top inset

## Goal
Stead's session and lead threads often open with a system line or a hairline card ("Stead surfaced an item" over "A brief to accept"; "Code put a story on the board"), in a `Thread` filling a Split's main (github.com/fcalell/stead, `packages/server/src/app/ui/conversation.tsx` lines 594 to 610, `routes/chats/route.tsx`; design/07-interface.md "Chats"). At 1280 px the first line starts 11 css px under the head's hairline (y 357 against the rule at 346), the line sitting almost on the rule, with no gap between it and its own card, while a log that opens with a message starts about 38 px under it. Evidence: chats critique unit u5, shots `session-1280-light`, `F-roundload-1280l` (Stead scratchpad `critique/u5/shots/`, stack at `5564217`).

## Approach
`THREAD_LOG` (`px-page pt-page pb-sections`, ui-core/src/variants.ts) should give every log the page inset on top, 24 px at 1280 before any entry; a system line is a centred one-line row at the target height (`SYSTEM` in plugins/react-ui/src/ui/components/message/index.tsx), so its text should start near 29 px under the rule, not 11. The measurement says the top inset does not reach a log that opens with a system line, so check first which of the two draws the offset (the log's padding, the `THREAD_UNDER_HEAD` margin, the first row's own margin). The app passes only the messages. Not 003-124 (the list's bottom room) and not 003-51. Seen at stack `5564217`.

## Acceptance criteria
- [ ] The first entry of a log stands the same distance under the head's hairline whether it is a message, a system line or a card.
- [ ] A system line and the card under it keep the gap two entries keep elsewhere.
- [ ] The Thread showcase holds a log opening with a system line and the critique measures the first entry's top against the hairline.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
