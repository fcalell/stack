---
id: 003-140
status: review
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
- [x] `stack screens test --all` passes `/foundations` and `/` at all five widths, both modes.
- [x] Each width specimen still reads its token's measure.

## Findings (screens session)

- The overflow came from more than the width bars: the `sizes` specimens (`min-w-image-cap`,
  `min-w-qr`, `min-w-message-input`), and the two-column `Modes` grid at 320, whose panels are too
  narrow for the display sample. Fixed in `foundations.tsx`: each width bar is `w-full` capped at
  `max-w-<width>` (its measure still in its label), each size box is `w-<size> max-w-full`, and
  `Modes` is one column below `tablet`. Overflow no longer fails at any width.
- axe's `color-contrast` then failed `/foundations` and `/`: the `pending` and `disabled` act
  specimens and the disabled field specimen were plain `div`s painted to look like those states, so
  axe judged them as live text. Each is now the real component in its state (`Button` `loading` and
  `blocked`, `FormField` `disabled` over an `Input`), whose DOM carries `aria-disabled`/`aria-busy`
  and `disabled`; the painted `pending` swatch is gone. A real pending act passes axe, so no token
  gap is filed. The field specimens' `<p>` also took no ink (they inherited the page's), now
  `text({ role: "body" })`.
- `stack screens test --all`: 17 files, 170 tests passed.
