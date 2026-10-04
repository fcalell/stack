---
id: 003-42
status: backlog
sessions: {}
---
# ui-core: a read that answers not found draws its "does not exist" form

## Goal
Every read ends in content, "does not exist" with a way back, or Retry. Every item screen, the review's file screen, a card, a job, an entity and each System record opened by an address after it was decided, dropped or removed; Now's main when the open item goes. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`QueryBoundary` draws every failed query as the failed `EmptyState` with its sentence and Retry and has no form for a not-found answer; its children run only with data, so an `EmptyState` among them never sees the error.

Reference: Sketch says "We cannot find this document" with one link back and no Retry ([screen](https://mobbin.com/screens/a99a2151-9161-4ded-b152-3e641beba398)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
