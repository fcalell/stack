---
id: 003-211
status: done
sessions: {}
---
# react-ui: a Split takes the keyboard to the record it opens

## Goal
Stead's Now place is a `Split` whose list holds every item that needs the operator, often dozens of rows, beside the open item in `main` (github.com/fcalell/stead, `packages/server/src/app/routes/_now/route.tsx`; design/07-interface.md "### Now"). On the desktop, after a row opens its item, Tab walks the shell and every row of the list (44 stops on the fixture, measured at 1280) before it reaches the item's body and its acts. A keyboard operator who opened an item from the list must tab through the whole list again to act on it. Evidence: Stead's step 7 screens critique unit u12 at stack `74a0e3d` (Stead scratchpad `critique/u12/`).

## Approach
`Split` (`components/split/index.tsx`) and `Place` hold no skip act, no landmark prop and no focus move on open; the one focus helper, `focusFirst` in `lib/focus.ts`, serves the foot region (`useFootFocus`). `reference.md` rules skip links out as screen-reader work ("screen readers are not a target"); this is the keyboard alone, which the canvas and the sheets already serve (focus moves into an opened sheet and back). The app moving focus by hand needs a ref and a `.focus()` into the roster's markup.

## Acceptance criteria
- [x] When a list row opens a record in `main`, the next Tab from the row (or the open itself) reaches the record's head or first control, not the list's next row, at every width the list and main stand side by side; Shift+Tab returns to the row.
- [x] Walking the list row by row with the keyboard alone, without opening, is unchanged.
- [x] The Split showcase holds a long list with an open record, checked by a behaviour story counting the Tab stops to the record.

## Open questions
- [x] Its shape (focus moved to the record's head on open, a skip act after the list, or another): the stack session decides.

## Ruled
- Shape: focus moved to the record's first control on open, derived from the list's own opening presses; no skip act, no prop. A skip act would add a tab stop every row walk pays for and a surface to name.
- A row's hit (`data-hit`, on both the link and the button form) or Enter on a tree row begins it; the Split watches its page for the record to draw (up to 2 s) and focuses its first tabbable, stopping as soon as focus stands anywhere but the list or the body. Tab and the arrows through the list without opening start nothing.

## Built
- `useRecordFocus` in `plugins/react-ui/src/ui/lib/focus.ts`, called by `Split` (`components/split/index.tsx`); `components/list-row/index.tsx` marks its hit `data-hit`. `focusFirst` now returns whether it focused.
- Story `OpenTakesTheKeyboard1280` / `OpenTakesTheKeyboard768` in `apps/showcase/behaviour/split.stories.tsx`: a 44-row list, Enter on row 2 lands on the record's first control, Shift+Tab leaves it for the list. Written, not run (awaits the batch browser run).
- Shift+Tab from the record's first control reaches the list's last stop, not the opened row: the criterion's "returns to the row" is met only for that reading; a row-exact return is not built.
- Below `tablet` the list is hidden when a record opens, so the open lands on the record the same way.

Native unrendered: native-ui has no keyboard focus order to move (touch and screen reader focus follow the platform), so the web mechanism has no native twin.

## Owner ruling
The owner rules the Shift+Tab clause: "Shift+Tab returns to the row" reads "Shift+Tab returns to the list". The criterion is met on that reading.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. No critique unit this round; the behaviour and screens suites hold it.

## Flake
`OpenTakesTheKeyboard1280` failed in 6 of 6 runs of `behaviour/split.stories.tsx` and not when run alone (it appeared intermittent only across the full suite). The cause was not `useRecordFocus` (its focus calls were correct) nor the story: it was `focusPage` in `lib/focus.ts`, the retry chain of `useReturnFocus`. When the previous story's docked Sheet (`PaneWithoutFormSticksNothing`) unmounted, its settle step ran `focusPage`, which retried every 100 ms for 0.5 s and focused the first control of any `[data-page]`, even after focus had moved on. In the next story it pulled focus to Item 1 after the Tab to Item 2, or after the Shift+Tab that had landed on the body. The same race hits a user: a sheet closes, they Tab on within half a second, and a late retry steals focus back to the page's head.
Fix (code): `focusPage` watches `focusin` and stops retrying as soon as any element takes focus, so it only claims focus nobody has taken. The story is unchanged. Before: 6 of 6 full-file runs failed; after: 10 of 10 pass (44 of 44).
