---
id: 003-51
status: review
sessions: {}
---
# ui-core: a conversation in a Split's main

## Goal
A `Thread` stands as the open record in a `Split`'s main under its record's `ItemHeader`, its log scrolling inside main and its `MessageInput`, or the question sheet docked in its place, at main's foot beside the list and the pane, at 375, 768 and 1440, inside a bleeding `Place`. Chats' open session or thread; Work's card thread at `/work/code/<card>/thread`. Both places carry their create act in `actions`, so no floating act stands over the input. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
Only a `Place` provides the context a `Thread` uses to fill its page and dock its foot; `Split`'s main is a scrolling region with no such provider, so a `Thread` there reports filling to the enclosing `Place`. Stack's showcase has no `Thread` inside a `Split`.

Reference: Relevance AI's list, timeline and details pane ([screen](https://mobbin.com/screens/4366a3ad-efe2-464b-99e7-2ff4202948a5)); Devin's sessions beside the conversation and its pane ([flow](https://mobbin.com/flows/b122b4f4-967e-4569-a4f7-7a126bf1535a)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Progress
Shape: no API change; a Split's main provides the Thread's fill and bleed contexts, and the `SPLIT_MAIN` `fills` cell insets its head. Built on web and phone; `pnpm check` and `pnpm verify` pass. Open: the live check (web per batch, phone on the harness).
