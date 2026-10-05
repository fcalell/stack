---
id: 003-44
status: review
sessions: {}
---
# ui-core: a header fact in words opens a sheet

## Goal
A fact in words with no hue in a record's header opens a sheet that explains it, read aloud as a button with the fact as its label. A thread's "Read outside content" in Chats opening the "Outside content" sheet. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`ItemHeader` takes `overline`, `title`, `facts` and `loading`. A status fact takes `onOpen` and draws as a chip that opens, but it carries a status's hue; a fact in words is a plain or quoted part and opens nothing. `ListRow` and `DefinitionRow` open things, but a header is neither a row nor a group of rows. A `Button` beside the facts draws a second control for one fact.

Reference: GitHub iOS's session header names its repo under the title ([screen](https://mobbin.com/screens/13e22b46-b056-463d-b90f-5dc0b39e1613)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Shape
`ItemHeader`'s `Fact` gains `{ label: Part; onOpen: () => void }`: the words in meta ink with a trailing `ChevronRight` at the meta fit, in a `PILL_ACT` press pulled back at its start, a button named by the fact. `PILL_ACT` leaves `Picker`'s holds and becomes shared. The consumer's `onOpen` opens its own `Sheet`.
