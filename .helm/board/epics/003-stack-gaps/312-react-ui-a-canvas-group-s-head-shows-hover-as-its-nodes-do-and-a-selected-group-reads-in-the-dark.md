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

## Review
Fresh critique (web; 375 touch and 1440 desktop, light and dark, real pointer): pass. The head's hover border equals a hovered node's `edge-hover` exactly (light `oklch(.61 .01 264)`, dark `oklch(.575 .01 264)`), and holds while the group is selected; the hover edge is 3.52:1 (light) and 4.45:1 (dark) on the canvas ground. Selected is a 2 px dashed line at 7.89:1 (dark) and 5.68:1 (light). Nits: selecting the group (1 px to 2 px border) moves the head's text 1 px right and down (caused here); at 375 the 374 px group frame overflows its 311 px pane and the title shows clipped at the left, and the zoom stack overlaps a node's lower edge when panned (pre-existing).

## Built (rework)
Selecting a group moved the head's text 1 px right and down and narrowed the head 336 to 334 (the frame's border went 1 px to 2 px). `CANVAS_GROUP.state.selected` now keeps the 1 px border box (`border-transparent`) and draws the second pixel as an inset dashed outline (`outline-2 -outline-offset-2 outline-dashed outline-selected-outline`), still a 2 px dashed line in `accent-ink`, held at 3:1 on `canvas`; nothing inside the frame moves. `ui-core.md` states it. `behaviour/canvas-group-kit.tsx` now reads the selected line from the outline (2 px, dashed, 3:1 on the ground) and asserts the head text's and the head's boxes (left, top, width, height) equal within 0.5 px at rest and selected. `canvas/wait.tsx` untouched.
