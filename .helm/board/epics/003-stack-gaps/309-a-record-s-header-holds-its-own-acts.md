---
id: 003-309
status: review
sessions: {}
---
# react-ui: a record's header in a Split's main holds its own acts

## Goal
Stead puts an open record's ends (End the thread, Delete the thread, a card's Drop, an item's Open the job) in the Place's more in the page's top bar (`packages/server/src/app/routes/chats/route.tsx:86`, `routes/work/route.tsx:115-119,218`). Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "split specific actions (for example delete thread, story, etc) should be in the split, not in the main header row". The owner rules a record's acts stand in its own header in the main; Stead's `design/07-interface.md` (Now's item frame, Chats, Work) now says so.

## Approach
`ItemHeader` takes only overline, title, facts and loading (`plugins/react-ui/src/ui/components/item-header/index.tsx`), and `Split` has no slot for its main's acts (`split/index.tsx:92-105`); only a `beside` `Screen` has `actions` and `more`. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] A record in a Split's main can carry its acts and a more in its header, on the header's first line at the end. (Built; the position awaits the batch browser run.)
- [x] Below `tablet`, where the record stands alone with the Place's back act, the acts stay reachable in one place, not two.
- [x] Native the same.

## Open questions
- [x] Its shape (props on `ItemHeader`, or on the `Split` main), and how it joins the Place's more below `tablet`: the stack session decides.

## Ruled
Props on `ItemHeader`: `actions` (icon acts) and `more` (menu items), the names and types `Screen` already has, so no new vocabulary. They draw at the end of the head's first line (the overline's, else the title's) at every width. Nothing joins the Place's more: the head is in the main at every width, and below `tablet` it stands under the Place's back act, so the acts have one place by never moving. A `Split` slot for acts is rejected (it cannot tell which node is the record's head). Loading draws no acts. The facts line is untouched (003-213 owns its height).

## Built
- `packages/ui-core/src/variants.ts`: `ITEM_HEADER_LINE`, `ITEM_HEADER_ACTS` (the acts' boxes reach across the line by the icon inset, so glyphs stand on it and the last at the head's end); roster: ItemHeader props `actions`, `more`, draws and owns the cells.
- `plugins/react-ui/src/ui/components/item-header/index.tsx`, `plugins/native-ui/src/ui/components/item-header/index.tsx`: the props; `IconButton` at the bar fit (body on touch and on the phone) then a `Menu`.
- Rules (react-ui, native-ui) and `ui-core.md` say where a record's acts stand and that they are not also the Place's.
- Evidence: `apps/showcase/behaviour/split-record.stories.tsx` `RecordActsOnTheOverlineLine`, `RecordActsOnTheTitleLine`, `RecordActsStayInOnePlaceBelowTablet`. Written, not run: they await the batch browser run.
- Native unrendered: the row is `flex-row` with the text `flex-1` and the acts `shrink-0`.
