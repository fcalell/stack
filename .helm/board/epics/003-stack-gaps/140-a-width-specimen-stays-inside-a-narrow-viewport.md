---
id: 003-140
status: backlog
sessions: {}
---
# plugin-react-ui: a width specimen stays inside a narrow viewport

## Goal
The showcase's `/foundations` passes `stack screens test`. Today every state of it, light and
dark, fails the overflow floor at 320, 390 and 768 (`horizontal overflow at 320px: scrollWidth
1101`), and so does `/`, which redirects to it.

## Approach
The width-token specimens in `plugins/react-ui/src/ui/showcase/foundations.tsx` draw each token at
its full measure and nothing bounds them to the column: the bars `div.h-1.bg-edge-strong` at
`w-selection` (1060 px), `w-sheet` (640 px) and `w-dialog` (520 px), and the `image-cap` specimen
(400 px). A specimen wider than the viewport has to say its measure without pushing the page wide.
How it does that (clamped with its number beside it, scrolled inside its own frame, or drawn to a
scale) is the stack session's call.

## Acceptance criteria
- [ ] `stack screens test --all` passes `/foundations` and `/` at all five widths, both modes.
- [ ] Each width specimen still reads its token's measure.
