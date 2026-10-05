---
id: 003-82
status: backlog
sessions: {}
---
# react-ui: sections in a Split's list and in a Sheet's body stand a sections gap apart

## Goal
Stead's Now list (the ask field, Needs you, Underway, Information), Work's board groups and the question sheet's review page (answers, then its bar) abutted with no gap (github.com/fcalell/stead, packages/server/src/app). The app now stands them in a host flex column with `gap-sections`, which the rules page allows as geometry, but the container owns spacing.

## Approach
`SPLIT_LIST` has no `gap-sections` where `SPLIT_PANE` has it, and `SHEET_BODY` (`p-card`) has no gap between its children. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
