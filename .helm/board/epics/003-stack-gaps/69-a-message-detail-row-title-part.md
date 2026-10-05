---
id: 003-69
status: backlog
sessions: {}
---
# ui-core: a message detail row's title is a Part

## Goal
Stead's conversation names a story on a card line under a hub message; a model-written name is drawn quoted (design/07-interface.md "Wording"; github.com/fcalell/stead, packages/server/src/app/ui/conversation.tsx).

## Approach
`MessageDetail`'s row `title` is a string (descriptors.ts), while ListRow's title is a Part that can carry the quoted mark; typing quotes into the string would be a workaround.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
