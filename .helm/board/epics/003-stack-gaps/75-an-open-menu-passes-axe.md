---
id: 003-75
status: review
sessions: {}
---
# react-ui: an open menu passes aria-hidden-focus and region

## Goal
Stead's knowledge page holds its ends under the Place's more (github.com/fcalell/stead, packages/server/src/app/routes/system/route.tsx). With the menu open, axe reports aria-hidden-focus (6 nodes) and region.

## Approach
The nodes are base-ui's focus guards (`[data-base-ui-focus-guard][aria-hidden="true"]`), focusable while hidden, and the menu popup outside any landmark. Seen at stack f6563f6.

## Shape
Split in two. `region` (a fix, web only): the Shell renders a popup layer as the last child of `<main>` and provides it as `PortalContainer` around its tree, so every popup (Menu, Picker, Select, Sheet) mounts inside the landmark; no stacking change, checked against `b-layers` and in the showcase at 375 and 1440. A page outside the Shell still portals to `body`.
`aria-hidden-focus` (no code): base-ui 1.8.0's `FocusGuard` spans are deliberate and no prop turns them off, so react-ui `guide/reference.md` gains one line saying an audit excludes `[data-base-ui-focus-guard]`, with the upgrade trigger named as a `// TODO:`, and an upstream issue is filed. Patching base-ui is rejected.
`lib/portal.ts` and the ui-core.md layers bullet change. No pins move.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.
