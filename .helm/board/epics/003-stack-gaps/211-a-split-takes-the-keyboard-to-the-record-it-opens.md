---
id: 003-211
status: backlog
sessions: {}
---
# react-ui: a Split takes the keyboard to the record it opens

## Goal
Stead's Now place is a `Split` whose list holds every item that needs the operator, often dozens of rows, beside the open item in `main` (github.com/fcalell/stead, `packages/server/src/app/routes/_now/route.tsx`; design/07-interface.md "### Now"). On the desktop, after a row opens its item, Tab walks the shell and every row of the list (44 stops on the fixture, measured at 1280) before it reaches the item's body and its acts. A keyboard operator who opened an item from the list must tab through the whole list again to act on it. Evidence: Stead's step 7 screens critique unit u12 at stack `74a0e3d` (Stead scratchpad `critique/u12/`).

## Approach
`Split` (`components/split/index.tsx`) and `Place` hold no skip act, no landmark prop and no focus move on open; the one focus helper, `focusFirst` in `lib/focus.ts`, serves the foot region (`useFootFocus`). `reference.md` rules skip links out as screen-reader work ("screen readers are not a target"); this is the keyboard alone, which the canvas and the sheets already serve (focus moves into an opened sheet and back). The app moving focus by hand needs a ref and a `.focus()` into the roster's markup.

## Acceptance criteria
- [ ] When a list row opens a record in `main`, the next Tab from the row (or the open itself) reaches the record's head or first control, not the list's next row, at every width the list and main stand side by side; Shift+Tab returns to the row.
- [ ] Walking the list row by row with the keyboard alone, without opening, is unchanged.
- [ ] The Split showcase holds a long list with an open record, checked by a behaviour story counting the Tab stops to the record.

## Open questions
- [ ] Its shape (focus moved to the record's head on open, a skip act after the list, or another): the stack session decides.
