---
id: 003-168
status: review
sessions: {}
---
# react-ui: a Select's highlighted label is not clipped

## Goal
In the 91 px list the highlighted "Virginia" clips: its `scrollWidth` is 43 against a `clientWidth` of 37. Measured by the sheet critique (`critique/sheet/report.md`, Select), pre-existing.

## Approach
The clip is the narrow list's (003-167): at the popover's width a label has its room. No separate change.

## Acceptance criteria
- [x] No option label in the open list has `scrollWidth` over `clientWidth` (`ListIsPopoverWide`).

## Built
Fixed by 003-167; `ListIsPopoverWide` asserts every label.
