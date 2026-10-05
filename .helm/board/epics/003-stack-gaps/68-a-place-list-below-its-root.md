---
id: 003-68
status: review
sessions: {}
---
# react-ui: a place's list that stands below the place's root

## Goal
Stead's System shows a repo's knowledge tree as the list at /system/repos/<repo>/knowledge, with a page in the main (design/07-interface.md "The knowledge editor"; github.com/fcalell/stead). On the phone a page's back act goes to /system, not to the tree.

## Approach
A Place's back act always goes to the place's route; a list standing at a deeper route cannot name itself as the back target.

## Shape
`Split.back?: Route`: the route where the list stands alone, which an open record returns to; it defaults to the Shell's place route. Its Place or pushed Screen reads it from the direct child Split in render (web `splitOf(children)?.props.back`; native in `useSplitHead`), and the Split hands `PlaceRoute value={back ?? place}` to its regions, so a missing read in the main leads back to the list.
The fact belongs to the list, not to `Place` (a Place with no Split has no back act to aim), and `back` is Screen's word for the same meaning. It is not derivable: the tree and the page share one layout component.
Both platforms; cells unchanged, only the back act's target moves. The roster, `DESIGN.md`, `b-roster` and `b7` closure fixtures and both rules pages follow. A tree standing alone at a deeper route with a back act of its own is filed as story 84.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.
