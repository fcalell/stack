---
id: 003-121
status: review
sessions: {}
---
# react-ui: an end-fit ActionBar wraps its acts before its first one is cut off

## Goal
Stead's stalled item has four acts ("Cut scope in the story's thread", "Split the story in its thread", "Accept the flags as known limits", "Continue refining"). At a 768 px viewport the first act's left edge stands at -13 px, cut off by the viewport, and at 1280 px at 499 px while the main starts near 600, so 101 px of it hides under the list pane; at 1440 px it fits. The operator cannot reach the first act and the page does not scroll to it (github.com/fcalell/stead, `packages/server/src/app/ui/item-screen.tsx`; design/07-interface.md "The bar"). Evidence: item screens critique unit u3, shots `stalled-bar-768-light`, `stalled-bar-1280-light` (Stead scratchpad `critique/u3/shots/`, stack at `5564217`). Anchor: Deel / Airwallex close-a-record bars (the references 07 names for the bar, https://mobbin.com/screens/f163ee8f and https://mobbin.com/screens/9769884d).

Re-measured by the item screens critique at Stead `54deb15` (unit u3, `it-stalled-1280-light`): at 1280 the first act "Cut scope in the story's thread" starts 119 px left of the record's left edge and its label is cut to "e story's thread"; at 768 it starts 271 px left of the record (13 px off the viewport's left edge) and "Split the story in its thread" is clipped too; 1440 fits. A three-act bar with a long label ("Add www.w3.org to the read hosts", Deny and Edit beside it) at 768 puts Deny 13 px left of the record's edge (245 vs 258 px for the Provenance section). Scroll width equals the viewport at 390 to 1440, so the clip is inside the record, not a page overflow.

## Approach
`ActionBar fit="end"` draws `BAR` as `flex flex-col items-end` and the acts as `flex items-center justify-end` with no wrap and no `min-w-0` / `max-w-full` (plugins/react-ui/src/ui/components/action-bar/index.tsx), so the acts row takes its max-content width and `items-end` pushes the overflow to the start edge, out of the container to the left. Below the `touch` set the acts stack, so the miss stands between touch and the width where four acts fit. 003-96 is the end bar's alignment under its content and the touch stack above the tab bar; it does not name an overflow, and its acceptance would not catch this. Seen at stack `5564217`.

## Acceptance criteria
- [x] An end-fit bar whose acts need more than its container wraps them to a further row, the filled act last, with every act inside the container's edges at every width the bar stands at.
- [ ] The ActionBar showcase holds a four-act bar at the narrowest non-touch container and the critique measures the left edge.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, whether the bar wraps, stacks below a measure, or collapses the quiet acts into a menu.

## Ruled
Bug, not a new shape: the end-fit acts row takes `flex-wrap min-w-0 max-w-full`, the filled act last in the DOM, so the acts wrap to a further row inside the container. No option or variant.

## Built
`ACTS.end` in `plugins/react-ui/src/ui/components/action-bar/index.tsx` is `flex flex-wrap items-center justify-end min-w-0 max-w-full`; the touch stack is unchanged (native stacks always). The ActionBar frame draws a four-act bar in a `w-list` column in the `BUTTON.fit.body` rest cell, and `apps/showcase/behaviour/action-bar.stories.tsx` (`WrapsInsideItsContainer`) asserts every act inside the column and the filled act on a lower row. Passes with the ActionBar and Button generated stories, waiting, form-leave and sheet behaviour stories; `pnpm check` build, types and tests pass.
The critique session measures the four-act bar's left edge.
