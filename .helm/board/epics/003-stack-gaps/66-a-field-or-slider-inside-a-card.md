---
id: 003-66
status: backlog
sessions: {}
---
# react-ui: an add field or a slider inside a Group's card

## Goal
Stead's Rules and Repos put an add field in the read hosts' card over its list, and Usage puts a window's reserve Slider in the card under its Meter (design/07-interface.md "Rules", "Repos", "Usage"; github.com/fcalell/stead).

## Approach
`Group` holds static rows or a List. A FormField or a Slider inside it stands flush with the card's edge, with no row inset, since only rows and Meter read the group context; the app now stands them in the Section beside the Group.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
