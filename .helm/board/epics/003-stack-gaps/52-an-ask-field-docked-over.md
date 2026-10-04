---
id: 003-52
status: backlog
sessions: {}
---
# ui-core: an ask field docked over a place's sections

## Goal
A message input stays in view at the foot of a `Place` while its `Section`s scroll under it, above the tab bar on touch, the latest exchange over it at the sections' end: the phone's convention for an assistant's home. Now's ask box on the phone. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`Thread` docks its `MessageInput` only as the `Place`'s whole body, and inside a `Section` stands inline. `MessageInput` has no docked form of its own. A `Place`'s `act` floats one filled `Button`, never a field. The `Shell` keeps room above a floating act or a `Thread`'s docked foot, nothing else.

Reference: Perplexity's home docks its ask field under its tasks ([screen](https://mobbin.com/screens/9ace483b-6a13-4ab9-81f6-362c2703b183)); Notion iOS docks it on an ordinary page ([screen](https://mobbin.com/screens/1d748074-5dd5-4a6e-8791-2098334f937a)); Claude iOS ([screen](https://mobbin.com/screens/7f9374bd-79d3-4552-9fe0-bd26e76c94f9)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
