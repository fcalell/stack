---
id: 003-41
status: review
sessions: {}
---
# ui-core: a record the main opened stands beside it

## Goal
An item's job and a card's item open beside the record that links to them, at a width fit for them from `wide`, and push over it with a back to it below. An item's job at `/items/<item>/jobs/<job>`, Chats' pane at `/chats/<conversation>/items/<item>`, `/chats/<conversation>/jobs/<job>` and `/chats/<conversation>/views/<lead>/<view>`, and a card's job at `/work/code/<card>/jobs/<job>`. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`Split`'s `pane` is the open record's details: it stands at `pane` (320) from `wide` and below `wide` only through a Details act that opens it as a side sheet titled Details, so a job view or an item screen stands at forty-five characters or hidden behind a Details act. `Screen` is a pushed page, and the route cannot know the width to choose between main and pane, since the `Split` decides by its page's width. A `Sheet` at the pane fit is an overlay over the scrim with no back to the main.

Reference: Cursor gives the diff about half the window beside the conversation ([screen](https://mobbin.com/screens/fa7df34d-7288-4c26-a0e9-95a84921e34e)); Devin puts it beside the file tree ([screen](https://mobbin.com/screens/943c5aac-94ad-4e06-bbab-70d3a88e3fa1)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Progress
Shape: `Split` takes `beside`, a `Screen` whose `back` is the main's route. From `wide` main and beside share what the list leaves, half each (fcalell's call: a structural fraction, no width token), the back act drawn as Close and the pane behind the Details act; below `wide` and on the phone it stands in the main's place. Open for the critique: the Place's head and the beside Screen's head stack below `tablet` and on the phone; the beside Screen keeps no floating act room. The showcase opens a deploy's step beside it. Built on web and phone; `pnpm check` and `pnpm verify` pass. Open: the live check (web per batch, phone on the harness).
