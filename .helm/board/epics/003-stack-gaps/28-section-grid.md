---
id: 003-28
status: review
sessions: {}
---
# ui-core: sections stand two to a row

## Goal
Martechthings' project health sets four blocks two by two at 1440, stacking below the desktop breakpoint. `Columns` lays sections side by side at the fixed column width, scrolling sideways, as a board.

## Approach
- References: Neon and Braintrust put two columns of panels under their summary ([screen](https://mobbin.com/screens/0cd7337d-2ecf-4211-bb02-95dbcb1bab11), [screen](https://mobbin.com/screens/ca9ccd87-f005-455d-b927-3c02fc77a90b)).

## Acceptance criteria
- [ ] Sections stand two to a row filling the body at desktop width and stack in order below it.

## Open questions
- [x] A `Columns` mode or a grid composition: the stack session decides.

## Shape
`Columns.fit?: "board" | "half"` read off a new `COLUMNS.fit` axis: `board` is today's sideways scroll (default); `half` stands sections two to a row filling the body from the `desktop` container width and stacks them below it, with no bleed and no column width. The phone always stacks.
