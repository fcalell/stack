---
id: 003-173
status: done
sessions: {}
---
# react-ui: a Menu row rings for keyboard focus alone

## Goal
Hovering a Menu row drew the 2 px keyboard ring on it (Rename, 5.5:1) with the pointer alone (critique `r2-sheet/report.md`, unit 4, `menu-hover-1280.png`, pre-existing). Base UI moves DOM focus to a hovered row; the ring is `focus-visible:` on the row.

## Approach
Measure with a real pointer first. The critic hovered a menu that a story's play had opened with synthetic events, which the browser does not count as user input: its `:focus-visible` heuristic then reads the page as keyboard-driven and matches every programmatic focus.

## Acceptance criteria
- [x] A real click on the trigger then a real hover on a row leaves the popup and the row `:focus-visible` false, outline none (probe `r3/p2.json`, `menuReal`: afterOpen, hover). ArrowDown then matches `:focus-visible` and rings the row.

## Ruled
Not a defect. The rows already ring through `:focus-visible` alone and the pointer's highlight is the wash (`menu/base.tsx` `ITEM`, 003-166); the critic's sample came from a play-driven page. A menu opened from the keyboard keeps the ring on a row the pointer then hovers, because Chrome keeps `:focus-visible` while focus moves on from a keyboard-focused element (`menuKbOpenThenHover`); that is the platform's semantics, the Picker's too. No code change.

## Ruled
The owner keeps it: after a keyboard open a pointer-hovered row keeps the ring, as Chrome's `:focus-visible` does and the Picker does; no pointer-versus-keyboard flag is added.
