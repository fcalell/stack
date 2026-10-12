---
id: 003-325
status: review
sessions: {}
---
# react-ui: a PendingBar's sentence wraps in a narrow column

## Goal
Stead's design critique of 2026-10-11 (github.com/fcalell/stead, `packages/server/test/review/findings-2026-10-11.md`, c5) found the Knowledge page's `PendingBar` clipping its sentence ("Refreshing the knowle…") in a 311 px bar while its act stood whole. The sentence is the live region and the one thing the bar says; an ellipsis loses its end.

## Approach
The sentence (`SENTENCE` in `pending-bar/index.tsx`) wraps (`wrap-break-word`) in place of `truncate`. The track is `flex items-center` and `min-h-control`, so a wrapped sentence grows it by a line; the one-line height must stay the control's, so the sentence carries the air a one-line sentence has (`py-[calc((var(--spacing-control)-1lh)/2)]`), one line exactly the control tall and a wrapped one the same air above and below. An `ActionBar`'s `pending` form stands in one grid cell with the bar, so the cell is the taller of the two and a wrapped sentence grows it by the lines it adds, the cost of not clipping.

## Acceptance criteria
- [x] In a 220 px column the whole sentence draws: no ellipsis, nothing past its box, two lines or more, inside the track.
- [x] With room the sentence is one line and the track the control's height (the `Swap Keeps The Bars Height` story holds).
- [ ] Native the same (`numberOfLines={1}` on the phone's sentence).

## Built
`plugins/react-ui/src/ui/components/pending-bar/index.tsx` (the class, the prop's comment) and the overlay allowlist. Stories `behaviour/pending-bar.stories.tsx`: `WrapsInANarrowColumn` (before: ellipsis, text overflowing its box; after: whole) and `OneLineWithRoom`; clocks, action-bar and `stories/PendingBar` pass in Chromium (20 of 20 with them). A padding on the track itself (`py-inside`, `py-pair`, both 6 px) pushed the one-line bar 1 to 2 px over the control's height, which the swap story caught; hence the sentence's centring padding.
Native unrendered; its sentence stays one truncated line, so the native box stays open.
