---
id: 003-207
status: review
sessions: {}
---
# react-ui: a row-fit Picker draws its hover and open fill at the control radius, not a pill

## Goal
Stead's repo screen puts a `Picker` at `fit="row"` as the value of two `DefinitionRow`s, "Landings go to" and "Sensitive above" (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/repos.tsx`, the `Picker`s at lines 252-262 and 304-314; design/07-interface.md "Repos"). On hover and while open the pick draws a wash with a computed border-radius of 9999 px, a pill around "main" and "100 kB", the only pill on a screen of 4 to 6 px controls. Evidence: Stead Repos critique unit u9 (stack `74a0e3d`, HEAD checked: nothing under `plugins/react-ui/src/ui/components/picker` has moved for this since), shots `hover-picker.png` and `picker-size.png` in the Stead scratchpad `critique/u9/shots/`.

## Approach
The row-fit trigger is `cn(PILL_ACT, picker({ fit }), ROW_TRIGGER, ...)` (plugins/react-ui/src/ui/components/picker/base.tsx), and `PILL_ACT = "rounded-full px-inside min-h-target"` (ui-core/src/variants.ts), whose comment calls it "words that act in a pill with no boundary at rest". The pill was chosen on purpose (003-06, 003-44, ui-core.md), so the app's composition is not the cause: it passes `fit="row"` and a label and cannot set a radius. It conflicts with ui-core's rubric (`packages/ui-core/guide/rubric.md`, radius: "controls and rows 4-6; ... pills only on chips and status"). A pick standing in a row is a control, not a chip or a status, and a row's own wash, a Menu row's and a ListRow's hover all draw at the row radius. The pill is invisible at rest, so on hover it reads as a different shape appearing beside rows that are not. The same `PILL_ACT` serves ItemHeader's opening and retry facts, which are not chips or status either; this story is the Picker's, and the stack session decides whether they follow.

## Acceptance criteria
- [x] A row-fit Picker's hover, press and open fill draws at the control radius (4-6 px), or the rubric names the pill as an exception for a row's pick and says why.
- [ ] The trigger's focus ring follows the same shape, on both platforms.
- [ ] The Picker showcase's row fit holds hover and open frames, measured by the critique at 390 and 1280 in both modes.

## Open questions
- [x] Its shape (a control-radius wash on the row-fit trigger, a cell other than `PILL_ACT`, or a ruled exception in the rubric): the stack session decides, and whether ItemHeader's facts share it.

## Ruled

Radius, not an exception: a pick in a row is a control, so the rubric's rule stands. The shared cell is renamed `WORD_ACT` and is `rounded-control px-inside min-h-target`. The Picker's row trigger and ItemHeader's opening, retry and save facts draw it, because they are controls too and a second cell would be a second shape for one idea. The focus ring is the element's outline and follows the radius. The Status in the save fact keeps its own dot.

## Built

`PILL_ACT` is `WORD_ACT` (`packages/ui-core/src/variants.ts`, `rounded-control`), renamed in the roster, `variant-tables.ts`, `ui-core.md`, both pickers' `base.tsx`, both `item-header/index.tsx` and the Place and Picker frame drawers. Evidence: `behaviour/picker.stories.tsx` `RowRadius` (desktop, 1280) and `RowRadiusTouch` (390) assert the trigger's computed `border-top-left-radius` is 6px at rest, under the real pointer's hover (the wash drawn) and open, and that the keyboard-focused outline is 2px solid. `place.test.ts` asserts `WORD_ACT` is `rounded-control` and not `rounded-full`. The generated Picker, Place and ItemHeader stories (rest, selected, disabled, light and dark, axe) pass. Left for the critique: the second box (the ring on both platforms; native is not rendered here) and the third (the frames measured at 390 and 1280 in both modes).
