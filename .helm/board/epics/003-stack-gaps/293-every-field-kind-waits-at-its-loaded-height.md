---
id: 003-293
status: backlog
sessions: {}
---
# react-ui, native-ui: every field kind waits at its loaded height

## Goal
003-179 matched a waiting field to its loaded height for a plain, a described, a switch and a checkbox field (`FieldWait` reads the field's shape through `fieldWaitOf`). A field holding a `Slider`, `Select`, `OptionList` or `SegmentedControl`, and an answered (folded) field, still wait as the plain label-over-box field and are not measured, so a loading Section over them changes height on load.

## Acceptance criteria
- [ ] A loading Section (and a `Section > Form`) over a field of each kind left stands at the loaded height, at the desktop density and at 375 touch, on both platforms.
- [ ] The kinds 003-179 matched are unchanged.

## Open questions
- [ ] Its shape (each kind's waiting form in `FieldWait`): the stack session decides; a narrowing goes to the owner before the build.
