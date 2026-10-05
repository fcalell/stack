---
id: 003-62
status: backlog
sessions: {}
---
# react-ui: a page's empty state whose act creates nothing

## Goal
Stead's Not found page (github.com/fcalell/stead, `packages/server/src/app/routes/$.tsx`; `design/07-interface.md`, "Addresses") is a `Place` holding an `EmptyState`, "Nothing is at this address.", whose act "Open Now" goes back to the home place. On a page, `EmptyState` draws its act as the filled create act with the plus glyph, so a way back reads as "create".

## Approach
`EmptyState`'s `act` takes an `Act` with no say over its glyph or its kind, and its page form always draws the create act. A `Button` beside it would stand outside the empty state's column, and a host element would restyle it.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
