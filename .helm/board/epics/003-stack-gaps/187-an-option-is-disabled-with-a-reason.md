---
id: 003-187
status: review
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
- [x] `Select`, `Picker`, `MultiPick` and `OptionList` all honour it, on both platforms.
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
