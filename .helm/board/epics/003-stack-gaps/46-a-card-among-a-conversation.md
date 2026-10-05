---
id: 003-46
status: done
sessions: {}
---
# ui-core: a card among a conversation's messages

## Goal
What an agent made (a proposed job, a brief, a note, a story, a surfaced item) stands in the conversation as a framed row with its kind, facts, status mark and state, opening its record; a free act stands as its verb over its arguments in the code role; the reads fold opens in place under its line. Chats' sessions and threads. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
Under 004-06 a `Thread` holds one item kind, `Message`, from data, so a `Group` of `ListRow`s or a `Code` cannot stand between messages. A system `Message` draws one centred meta line with a chevron: it carries the card's words with no status mark, no chip and no frame, so a proposed job, a relay, a free act and a reads fold read alike, and the reads it folds open only in a sheet.

Reference: Linear's agent puts the issues it found as rows in a hairline card inside the conversation ([screen](https://mobbin.com/screens/692145d1-6e38-4386-9a5a-e597c4c120b4)); Airbnb ([screen](https://mobbin.com/screens/566e11cb-7eb3-4699-bb32-4559bc721575)); GitHub iOS ([screen](https://mobbin.com/screens/13e22b46-b056-463d-b90f-5dc0b39e1613)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Progress
Shape: a system `Message` takes `detail?: MessageDetail` and the Thread's message map a `detail` slot; a detail is exactly one of `row` (a ListRow in a hairline card, `MESSAGE_CARD`), `code` (a free act's arguments under its verb) or `fold` (lines the line opens in place, `MESSAGE_FOLD`). The key is `row`, never `card`, by the product-noun rule. For the critique: the cells' class strings and the web's centred column. Built on web and phone; `pnpm check` and `pnpm verify` pass. Open: the live check (web per batch, phone on the harness).
The web design critique's findings are fixed and measured at 1440 and 375 (light).
