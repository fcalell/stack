---
id: 003-74
status: review
sessions: {}
---
# react-ui: a Screen's scrolling body is reachable by keyboard

## Goal
Stead's sink screen (github.com/fcalell/stead, packages/server/src/app/routes/system/-components/sinks.tsx) at 375 px: axe reports scrollable-region-focusable.

## Approach
The node is the Screen body's scroller (`.h-0.flex-col.grow > .overflow-y-auto.flex-col.grow`), which scrolls while holding no focusable content and carries no tabindex. Seen at stack f6563f6.

## Shape
Web only. `useScrolls` is lifted out of `code/index.tsx` into `lib/scrolls.ts`, taking an axis; Code keeps its own use. Every frame scroller (Screen `BODY`, Place `BODY`, Split `LIST`/`MAIN`/`PANE`, Sheet `BODY`) takes `tabIndex={scrolls ? 0 : undefined}` with the inset ring `focus-visible:-outline-offset-2`, as Thread's `SCROLLS`.
The stop stands only while the region scrolls and holds nothing tabbable, which is axe's condition: it adds no stop to a body of links, at the cost of a tabbable query on resize. No role or name; focus reads the content inside `main`. No contract change; an inset ring is the only look. Same unit as 73.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Critique
Unrendered: no story draws a scrolling Screen body with nothing tabbable inside.
