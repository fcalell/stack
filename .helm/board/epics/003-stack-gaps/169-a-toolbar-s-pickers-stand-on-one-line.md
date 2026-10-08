---
id: 003-169
status: review
sessions: {}
---
# react-ui: a Toolbar's two Pickers stand on one line when there is room

## Goal
The two bar Pickers in a Toolbar stand on two lines at 1280 (y 22 and 58) with room beside them. Measured by the sheet critique (`critique/sheet/report.md`, Picker), pre-existing.

## Approach
`fit="bar"` is the Picker that fills its column (`w-full`, for a rule row); a Toolbar's picks are field boxes (`PICKER`'s own comment: "a field box in a toolbar"), the default fit. The Toolbar frame and the `Behaviour/Picker` pair drew `fit="bar"` in a content-sized wrapping row, so each filled a line. They take the default fit.

## Acceptance criteria
- [x] The Toolbar frame's and the pair story's two Pickers stand on one line at 1280 (`Start` asserts the two triggers' tops).

## Built
`fit="bar"` is gone from the Toolbar frame (`showcase/frames/toolbar.tsx`) and the `Pair` story (`behaviour/picker.stories.tsx`); `Start` asserts one line.
