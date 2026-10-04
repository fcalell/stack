---
sessions: {}
---
# Render smells

## Goal
No react-ui or native-ui component paints correctly only by accident of render, measure or commit
timing, and none renders work it already did. A frame knows what its children need before first
paint; a sheet keeps its content until it has left; an ordering is an event, not a timer; text
fits by layout, not by measure; and a render does only the work its inputs changed.

## Breakdown rationale
Evidence: `.helm/research/render-smells.md` (72 findings, dated at master 0b0075c). Every finding
was checked against master 667303b and its references are updated in the stories. Paths below
are under `plugins/react-ui/src/ui/` (web) and `plugins/native-ui/src/ui/` (phone).

One story per coherent fix. A story touches one component family on both platforms and lands as
one commit. Themes, in build order:

- **A, a child tells its frame what it is after paint** (01 to 07). Decided by fcalell
  (2026-10-04): frames learn what children need up front, through props or slots, never by
  layout effects or post-paint state pushes. Where a registration must stay (a parent cannot
  know a child's kind statically), it is read in render from a host object, not pushed into
  parent state. These go first: 08 to 15 build on the frames they settle. 06 diagnoses why every
  phone sheet reaches the screen only through `SheetBase`'s `onChange` commit.
- **B, a sheet resets or closes mid-dismiss** (08, 09).
- **C, timers stand in for ordering** (10, 12, 13, 14) and the phone log's two-phase scroll (11).
- **D, measured text** (15).
- **E, wasted renders** (16 to 22), last: several shrink once A removes the state pushes that
  re-render whole frames.

### Dropped as fixed
None whole. The commits since 0b0075c (epics 003 and 004) rewrote Place, Split, Screen, Group,
Thread, SheetBase and MessageInput, but every mechanism remains. Two parts are fixed and drop
out: the phone `SheetBase`'s `held` ref is now cleared in `onDismiss` (the rest of that finding
stays in 09), and the phone `Place`'s `ActRoom` element now reaches only the `bleed` body (its
rebuilt `lead`, `acts` and `room` stay in 17). Several grew: Split gained a `besideOpen` push
(02) and its own copy of the `fills` swap (03), and Place's new `foot` feeds the Shell's measured
footing (04).
