---
id: 003-68
status: backlog
sessions: {}
---
# react-ui: a place's list that stands below the place's root

## Goal
Stead's System shows a repo's knowledge tree as the list at /system/repos/<repo>/knowledge, with a page in the main (design/07-interface.md "The knowledge editor"; github.com/fcalell/stead). On the phone a page's back act goes to /system, not to the tree.

## Approach
A Place's back act always goes to the place's route; a list standing at a deeper route cannot name itself as the back target.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
