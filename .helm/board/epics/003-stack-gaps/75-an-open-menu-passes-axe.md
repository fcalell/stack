---
id: 003-75
status: backlog
sessions: {}
---
# react-ui: an open menu passes aria-hidden-focus and region

## Goal
Stead's knowledge page holds its ends under the Place's more (github.com/fcalell/stead, packages/server/src/app/routes/system/route.tsx). With the menu open, axe reports aria-hidden-focus (6 nodes) and region.

## Approach
The nodes are base-ui's focus guards (`[data-base-ui-focus-guard][aria-hidden="true"]`), focusable while hidden, and the menu popup outside any landmark. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
