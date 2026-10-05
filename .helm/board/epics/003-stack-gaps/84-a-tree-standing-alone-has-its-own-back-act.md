---
id: 003-84
status: backlog
sessions: {}
---
# ui-core: a list standing alone at a deeper route draws its own back act

## Goal
Stead's System shows a repo's knowledge tree as the list at `/system/repos/<repo>/knowledge`, with a page in the main (`design/07-interface.md`, "The knowledge editor"; github.com/fcalell/stead). The phone sketch draws the tree alone with its own back act, "‹ Knowledge", to the repo, one level above the tree. Stack draws no back act on a list standing alone: a Place draws one only with a record open.

## Approach
`Split.back` (story 68) is the route an open record returns to, the list's own route. The tree's back act needs a second route, the list's parent, which neither the Split nor the router can derive: the tree and the page share one layout component. Story 68 left it out of scope.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides. A second route on `Split`, or a back act on the Place that a list standing alone also draws.
