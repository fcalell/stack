---
id: 003-74
status: backlog
sessions: {}
---
# react-ui: a Screen's scrolling body is reachable by keyboard

## Goal
Stead's sink screen (github.com/fcalell/stead, packages/server/src/app/routes/system/-components/sinks.tsx) at 375 px: axe reports scrollable-region-focusable.

## Approach
The node is the Screen body's scroller (`.h-0.flex-col.grow > .overflow-y-auto.flex-col.grow`), which scrolls while holding no focusable content and carries no tabindex. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
