---
id: 003-174
status: review
sessions: {}
---
# react-ui: a docked Sheet opened by the pointer draws no ring on its Close

## Goal
A docked Sheet took focus on Close with the 2 px ring visible at rest (`r2-sheet/report.md`, unit 1, pre-existing: "the first control the keyboard meets is the dismiss act"). The sheet focuses its first tabbable once it settles; with no field in the body that is Close (Back on page 2).

## Approach
Measure a real pointer open: a `Place` whose foot is a button, a real click opening a docked `Sheet` with a body holding no field.

## Acceptance criteria
- [x] After a real click the focused element is Close, `:focus-visible` false, outline none (probe `r3/p2.json`, `dockReal`).

## Ruled
Not a defect. Close takes focus whichever way the sheet opens, and the ring follows the browser's `:focus-visible` heuristic: drawn when the sheet is open at mount (no input yet: the critic's frame, `behaviour-sheet--docked-title-outranks-its-body`) or after the keyboard, never after a pointer. A page with a field in its body focuses the field. No code change.
