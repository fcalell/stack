---
id: 005-04
status: review
sessions: {}
---
# react-ui, native-ui: toasts stand above a docked foot without the Shell measuring it

## Goal
A docked foot (a Thread's `MessageInput`, a Place's `foot`) reports its height to the Shell
through `useFootDocks` (web `lib/frame.ts:25-39`, a ResizeObserver; phone `lib/frame.ts:34-47`,
`onLayout`), into Shell `footing` state (web `shell/index.tsx:105`, spacer `:186-189`; phone
`shell/index.tsx:102`). Each line typed re-renders the whole Shell, and the toasts follow the
foot a commit late. On the phone the reset runs only on unmount, so a Thread that drops its
`foot` leaves toasts standing over a gap. The phone also measures the toast frame twice, column
`onLayout` to `setHeight` (`:121`) and content `onLayout` to `setFrame` (`:130`): the layer is
absent until both fire (`:160`) and moves after paint when the banner grows or `covered` changes.

## Approach
Decided by fcalell (2026-10-04): a frame learns what its children need up front, through props
or slots, never from a layout effect or a post-paint state push; a registration that must stay
(the parent cannot know a child's kind statically) is read in render from a host object.

The toast layer stands in the column's own structure, so its bottom edge is the content's bottom
edge above any docked foot by layout: on the web the viewport sits in the page column over the
log; on the phone the layer is a sibling that reserves the same insets and banner. `useFootDocks`,
`footing`, the spacer, the column `onLayout` and the `height` and `frame` states go. The floating
act's room is 01's.

## Acceptance criteria
- [x] (test) neither Shell holds `footing`, `height` or `frame` state, and `useFootDocks` is gone.
- [ ] (live) web, assistant at 375: a toast stays above the MessageInput as it grows line by line, in the same frame.
- [ ] (live) phone, on the harness, in 03's conversation: a toast stands above the foot at first paint, follows its growth, and drops when the foot goes.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Web live on the assistant at 375 and 1440: as the input grows seven heights, no frame has the toast over the foot, the gap constant in the same frame. Web uses CSS anchor positioning (Baseline since January 2026). Phone: one box measure remains, an accepted limit with a `// TODO:` (the layer stands after the sheet host, outside the page tree). Open: the phone live criterion on the harness.

## Critique
Unrendered: no story draws a toast over a docked foot.
