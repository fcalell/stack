---
id: 003-312
status: review
sessions: {}
---
# react-ui: a canvas group's head shows hover as its nodes do, and a selected group reads in the dark

## Goal
A group head is selectable and takes the keyboard but shows no hover look where nodes do, and the dark selected dashed accent line is subtle.

Found by the critique of 003-191.

## Acceptance criteria
- [x] A group head draws the same hover form as a node.
- [x] The dark selected dashed line meets 3:1 against the canvas ground.
- [x] The Canvas group stories at 375 and 1440, both modes, show hover and selected.

## Ruled
A node's hover is its border stepping to `edge-hover`; a head has no border of its own, so `CANVAS_GROUP_HEAD` takes a transparent 1 px border and the button `hover:border-edge-hover` (the frame's body takes no pointer, so only the button can be hovered). The head shows hover while its group is selected too: the selection is the frame's line, not the head. The colour already held 3:1 (`accent-ink` is 4.5:1 on `group`, lighter than `canvas` in dark); what read faint was one dashed pixel, so `CANVAS_GROUP.state.selected` is `border-2` (the spinner's `border-2` is the precedent) and `accent-ink` declares the hold on `canvas` at 3:1 in both modes. No new option or token.

## Built
`CANVAS_GROUP_HEAD` (a transparent border) and `CANVAS_GROUP` (`variants.ts`, `variant-tables.ts`), `HOVERED` in `canvas/group.tsx` (a variant is a platform overlay, as in `node.tsx`), the `accent-ink` hold on `canvas` (`tokens.ts`), the `ui-core.md` Canvas paragraph, `guide/canvas.md`. Stories: `behaviour/canvas-group.stories.tsx` (1440) and `canvas-group-phone.stories.tsx` (375), each light and dark over `canvas-group-kit.tsx`: the head's hovered border equals a hovered node's, and the selected frame's computed line, read through the browser's canvas into sRGB, is at least 3:1 against the canvas ground and 2 px dashed. The four pass in Chromium with the other canvas behaviour files and `Canvas.stories.ts` (145 tests in all). The critique's reading of the faint line awaits the fresh critic.
