---
id: 003-121
status: backlog
sessions: {}
---
# react-ui: an end-fit ActionBar wraps its acts before its first one is cut off

## Goal
Stead's stalled item has four acts ("Cut scope in the story's thread", "Split the story in its thread", "Accept the flags as known limits", "Continue refining"). At a 768 px viewport the first act's left edge stands at -13 px, cut off by the viewport, and at 1280 px at 499 px while the main starts near 600, so 101 px of it hides under the list pane; at 1440 px it fits. The operator cannot reach the first act and the page does not scroll to it (github.com/fcalell/stead, `packages/server/src/app/ui/item-screen.tsx`; design/07-interface.md "The bar"). Evidence: item screens critique unit u3, shots `stalled-bar-768-light`, `stalled-bar-1280-light` (Stead scratchpad `critique/u3/shots/`, stack at `5564217`). Anchor: Deel / Airwallex close-a-record bars (the references 07 names for the bar, https://mobbin.com/screens/f163ee8f and https://mobbin.com/screens/9769884d).

## Approach
`ActionBar fit="end"` draws `BAR` as `flex flex-col items-end` and the acts as `flex items-center justify-end` with no wrap and no `min-w-0` / `max-w-full` (plugins/react-ui/src/ui/components/action-bar/index.tsx), so the acts row takes its max-content width and `items-end` pushes the overflow to the start edge, out of the container to the left. Below the `touch` set the acts stack, so the miss stands between touch and the width where four acts fit. 003-96 is the end bar's alignment under its content and the touch stack above the tab bar; it does not name an overflow, and its acceptance would not catch this. Seen at stack `5564217`.

## Acceptance criteria
- [ ] An end-fit bar whose acts need more than its container wraps them to a further row, the filled act last, with every act inside the container's edges at every width the bar stands at.
- [ ] The ActionBar showcase holds a four-act bar at the narrowest non-touch container and the critique measures the left edge.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the bar wraps, stacks below a measure, or collapses the quiet acts into a menu.
