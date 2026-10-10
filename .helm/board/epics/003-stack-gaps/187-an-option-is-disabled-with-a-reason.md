---
id: 003-187
status: todo
sessions: {}
---
# ui-core: an Option disabled with a reason

## Goal
Stead's workflow canvas sets an agent node's agents in a `Picker`, and design/07-interface.md "### A workflow: the canvas" (the node sheet row) asks that it "enables the agents that meet the contract and disables the rest with why (\"lacks brief.flag\", \"asks for edit\")". Today (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/node-sheet.tsx:291-292` and `:337-358`) the unfit agents are left out of the options and listed with why in the `FormField` description ("Not offered: Reviewer lacks brief.flag; ..."). It costs Stead the sight of the unfit agents in the list itself, and a sentence of reasons the viewer must match to names by reading.

## Approach
`Option` (`ui-core/src/descriptors.ts`, line 108) holds `value`, `label`, `description`, `recommended`, `status`, `avatar`, `icon` and `chip`: no `disabled` and no reason. Things tried:
- `description` carries the reason as text, but the option stays choosable, so the picker would let the viewer pick an agent the contract refuses; the app would have to refuse after the pick.
- `status` and `chip` mark an option but do not block it.
- Filtering the option out (the interim) hides it from the list. `Act` and `RowLeading` already have `blocked` (a reason drawn while disabled, `descriptors.ts` lines 19-29, 130-145, 320-329), so the roster has the pattern for acts and rows, but not for options.
- The option rows (`plugin-react-ui/src/ui/components/option-list/index.tsx`, `Picker` in `components/picker/`) read no disabled state per option; the only `aria-disabled` there is the picker trigger's `act.loading` (`picker/base.tsx:237`). The app cannot disable one row of a Picker without a local copy of the list.

## Acceptance criteria
- [x] A blocked option takes no pointer, touch or key; its reason leads its meta line; a blocked option that is in the value is drawn and operable as any chosen one.
- [x] A disabled option already in the value stays shown as chosen and removable, as a chip and in the list.
- [ ] `Select`, `Picker`, `MultiPick` and `OptionList` all honour it, on both platforms.
- [x] A blocked option row draws no highlight fill, from the pointer or from a key landing on it; a key landing on it still shows the keyboard ring, and it presses and picks nothing (the Select and Picker lists and the Menu's blocked items).
- [x] A picker with no disabled option is unchanged.
- [x] The Picker showcase holds a list with enabled and disabled options (the frame's owner list and a pick of several holding a blocked chosen option), measured by the critique at 320 and 1440 px: the critique is run by a session that played no part in the work and is not run here.

## Open questions
- [x] Its shape: `blocked?: string`, named as `Act` and `RowLeading.check` name it.
- [x] Whether a disabled option sorts after the enabled ones or keeps its place: it keeps its place; the app orders its list.

## Ruled
`Option.blocked` is why the option cannot be chosen (a short phrase; truncates), not `disabled`: the roster already says a reason is the disabled state. One rule in `optionBlocked(option, chosen)` (`ui-core/src/list-state.ts`), read by both platforms: an option is blocked only while it is not in the value, so a chosen blocked option draws as any chosen option and stays removable by every path with no second code path. The reason replaces the description under the label while blocked, label and reason in `ink-disabled`, a recommended mark stays, the row is a two-line row. Screen readers are not a target (no `aria-describedby`): Base UI's disabled semantics and the reason in the row's text are the whole of it. `SegmentedControl` is out (its options are not `Option`).

## Built
- `Option.blocked` and `optionBlocked` in `packages/ui-core` (`descriptors.ts`, `list-state.ts`, unit test in `test/option-list.test.ts`); roster entries Select, Picker, OptionList list the cells and tokens they now draw; `DESIGN.md` regenerated.
- react-ui: `OptionList` (check rows through `Field.Root disabled`, radio rows through `Radio.Root disabled`, no wash while blocked), `Picker` (`picker/base.tsx`: `Select.Item` and `Combobox.Item` `disabled`; the touch sheet's rows are `aria-disabled` buttons that pick nothing and the open tab stop starts on the first row that can be chosen), `Select`.
- native-ui: `OptionList` and the shared `PickSheet` (`picker/sheet.tsx`, so `Picker`, `MultiPick` and `Select` follow): a blocked row is a disabled `Pressable` with the disabled ink and its reason.
- Base UI's select list lets the arrow keys reach a disabled row (as the menu's does); Enter and a press on it pick nothing.
- `guide/rules.md` of both platforms and `ui-core.md` state it. The Picker showcase frame holds a blocked owner and a pick of several with a blocked chosen chip.
- Evidence: `behaviour/option-list.stories.tsx` (BlockedChecks and BlockedRadios at 320 and 1440), `behaviour/picker.stories.tsx` and `behaviour/select.stories.tsx` (Blocked at 320 and 1440) pass with the existing stories in the three files (23 of 23): a blocked row is disabled, takes no click or Enter, its reason is in a different ink from the description and its row height equals the described row's; the chosen blocked option is enabled, shows no reason, and once unticked or removed is blocked again with its reason.

## Owner ruling
The owner rules: a query-driven `OptionList`'s `option` map gains a `blocked` slot (a field name, as its other slots), so an option read from data can be blocked. The arrow keys landing on a blocked option in the Select and Picker lists is accepted (as the Menu); Enter and a press pick nothing. To build: the map slot. Still open after it: the touch sheet and native rows unexercised, and the critique.

## Built (the map slot)
- `OptionSlots.blocked` (`ui-core/src/list-state.ts`): a function of the loaded item returning the reason or `undefined`, as the other slots; `optionsOf` carries it into `Option.blocked`, so both platforms' `OptionList` draw and act on it with no change of their own (they read `optionsOf`). It leaves the waiting shape unchanged. Unit test in `test/option-list.test.ts`; both `guide/rules.md` pages and `ui-core.md` list the slot.
- Evidence: `behaviour/option-list.stories.tsx` `BlockedFromData320`, `BlockedFromData1440` (check rows) and `BlockedRadiosFromData1440` read the three agents from a query through the `option` map and pass the same checks as the static set (disabled, no click, reason in its own ink, row height equal to the described row's, chosen blocked option enabled and removable then blocked again): 16 of 16 in the file; the run peaked at 2954 MiB.

## Owner ruling
Second ruling: a touch-sheet story is added (a blocked option at a touch viewport). The native rows stay unticked until a native render exists.

## Built (the touch sheet)
`behaviour/picker.stories.tsx` `BlockedSheet` opens the touch sheet at a 320 px viewport and the touch density. A blocked row is `aria-disabled` and the enabled rows are not; its reason is in a different ink from a described row's description, at the same row height; the sheet opens focused on the chosen row; a press on the blocked row picks nothing and keeps the sheet open; a press on an enabled row picks and closes it. In the pick of several, the blocked chosen option is an enabled, ticked row with no reason; pressing it unticks it and it is blocked again with its reason, and pressing it again picks nothing. Passes with the rest of the Picker and Shell files (17 of 17; peak 2442 MiB).

## Open
- The native rows (`OptionList` and the shared `PickSheet`) are not rendered by any story; the `Select`, `Picker`, `MultiPick` and `OptionList` box stays unticked until a native render exists. The web touch sheet is now exercised.
- The critique has not measured the Picker frame at 320 and 1440.

## Owner ruling
Third ruling: a blocked option row draws no highlight fill, from the pointer or from a key landing on it; a key landing on it still shows the keyboard ring, and it presses and picks nothing. Same in the Select and Picker lists and the Menu's blocked items.

## Review
Fresh critique of the Picker frame (`shared-picker--rest`, 1440 desktop and 320 touch sheet, light and dark): the owner list's blocked row (Dana Moss, "On leave until June") is a two-line row of 52 px (touch 64 px), equal to the described rows; label and reason share the disabled ink (3.04:1 light, 2.73:1 dark, within the disabled exemption); a click (1440) or press (320) on it picks nothing and keeps the list open. The pick of several draws a "Dana Moss ×" chip, and Dana's row is ticked, enabled and shows no reason; rows 52/64 px; no overflow at 320. Finding: at 1440 hovering the blocked row highlights it with the 5 % hover fill as an enabled row (caused here; the touch sheet does not). Nit, pre-existing: desktop chip remove targets are 22x22 px, inside the spacing exception.

## Built (rework)
- `select/index.tsx` (the `Select` has its own list): the highlight wash is passed only when the row is not blocked, and a blocked row a key lands on draws the ring (the Select drew none before, its wash being the only marker), through a `keyed` state set by a key in the popup and cleared by the pointer and on open or close.
- `picker/base.tsx`: the `Select.Item` and `Combobox.Item` className callbacks pass `state.highlighted && blocked === undefined` to the row (no wash), and keep `optionFocus(state.highlighted, keyboard.keyed)` for the ring. `menu/base.tsx` `rowOf` uses `highlighted && !blocked`. `option-list` already draws no hover wash on a blocked row (`PRESS` only while not blocked); nothing to change there.
- Stories: `behaviour/picker.stories.tsx` and `select.stories.tsx` Blocked (1440 for the pointer; both widths for the key): a key landing on the blocked row shows an outline and a background equal to a rest row's; at 1440 the real pointer over it leaves the background equal to a rest row's. `menu.stories.tsx` `BlockedItem` asserts the same for the Menu's blocked item and that Enter leaves the menu open.
- `rules.md` (react-ui) and `ui-core.md` state it. No ui-core cell changed for this part; DESIGN.md is unchanged.
- Native unrendered; the native rows and the critique stay open, status stays review.

## Built (rework 2)
Finding A (searchable Picker, `shared-picker--rest` Owner at 1440): a key landing on a blocked row drew no ring because a searchable list's keys land on its input, which keeps them from the popup, so `keyed` never rose; and the enabled rows there mark the key's position with the wash alone. `useKeyed` in `picker/base.tsx` gains `landed`/`input` (a key on the input sets it, the pointer clears it); the `Combobox.Item` of a blocked row reads `landed` for its ring, an enabled row reads `keyed` as before.

Finding B (touch sheet, 320): the sheet's option button carried `focus-visible:bg-wash-hover`, so an arrow onto the `aria-disabled` row drew the 5 % fill with the ring. The wash is now added only to a row that can be chosen (`OPTION_FOCUS_WASH`); a blocked row keeps the ring alone.

Stories in `behaviour/picker.stories.tsx`: `BlockedSearch1440` (a searchable list, the key lands on the blocked row: outline width above 0, background equal to a rest row's; an enabled row the key lands on keeps its wash); `BlockedSheet` gains the arrow onto the blocked row (focus there, outline width above 0, background equal to an enabled row's). Both failed before the fix. Browser run: picker (10), select, menu, option-list, row-meta and section-more pass. Native unrendered.
