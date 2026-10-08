---
id: 003-187
status: backlog
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
- [ ] An `Option` can be disabled with a reason (a short phrase) that the option row draws under its label, in the disabled ink; a disabled option cannot be chosen by pointer, touch or keyboard, and is announced as unavailable with its reason.
- [ ] A disabled option already in the value stays shown as chosen and removable, as a chip and in the list.
- [ ] `Select`, `Picker`, `MultiPick` and `OptionList` all honour it, on both platforms.
- [ ] A picker with no disabled option is unchanged.
- [ ] The Picker showcase holds a list with enabled and disabled options, measured by the critique at 320 and 1440 px.

## Open questions
- [ ] Its shape (`disabled?: string` as the reason, or `blocked` as `Act` names it, or another): the stack session decides.
- [ ] Whether a disabled option sorts after the enabled ones or keeps its place: the stack session decides.
