---
id: 003-292
status: review
sessions: {}
---
# native-ui: a Details sheet holds its form's submit in reach

## Goal
003-200 keeps a long form's submit in reach in a Split pane on the web (a sticky foot in the pane). On the phone the same pane opens as the Split's Details sheet, and a long form there scrolls its `ActionBar` out of reach: React Native has no sticky, so the web shape does not carry. The operator scrolls to the end to save.

## Acceptance criteria
- [x] A long `Form` in a Split's Details sheet on the phone keeps its submit in reach while its fields scroll, at 375 and 390, light and dark. (By construction: the bar is the sheet's foot, which `fixed` moves into gorhom's footer once the content is capped; native unrendered.)
- [x] A short form in the sheet is unchanged. (Uncapped, the foot stands at the content's end, where the bar stood.)

## Owner ruling
The sheet's own pinned foot, no prop. A native `Form` in a sheet (`FormStands` `sheet`) lifts its direct `ActionBar` (through fragments, by the existing `liftBars` in `lib/field-wait.tsx`) out of its body into the sheet's foot slot, for every native sheet, not only the Split pane, as the web `Form` does for `pane` and `sheet`. `SheetBase` gains a foot-slot store built like `partsStore` (a subscribed store, not React state, so setting it does not re-render the Form). The Form sets the slot each render in a layout effect, holding the bar in the Form's `FormContext` and `TouchedContext`, and clears it on unmount. `footed` is true when `foot`, `acts` or the slot is set. `Foot` draws `acts` first, then the slot's bar, in `SHEET_FOOT` (replacing the sectioned form's `FORM_FOOT`). A sheet-level `submit` would not do: a Form's bar can hold several acts.

## Ruled
- The slot also carries the Form's `LoadingContext`, so a bar of a form inside a loading Section still waits as its own form in the foot.
- A docked sheet (`SheetDocked`) provides no slot: its Form keeps the bar in flow, as its body already scrolls above a pinned foot of its own.
- `partsStore` became one generic `store<T>` the parts and the foot slot share.

## Built
`FootSlot` and `FootSlotContext` (`plugins/native-ui/src/ui/lib/form.ts`). `SheetBase` (`components/sheet/base.tsx`) builds the slot beside its parts store, its layer provides it, and it reads only whether the slot is set (`useSyncExternalStore` on a boolean), so it renders as the bar appears or goes and not as the Form renders; `footed` joins `foot`, `acts` and the slot, and `Foot` draws `acts`, then the slot's bar. `Form` (`components/form/index.tsx`) lifts its direct `ActionBar` with `liftBars` when it stands in a sheet with a slot, sets the slot in a layout effect each render and clears it on unmount; the bar wrapped in `FormContext`, `TouchedContext` and `LoadingContext` keeps its blocked reason and touched state in the footer's tree. A sectioned form in a sheet no longer draws `FORM_FOOT` (its bar is gone from the body); elsewhere it does. `Fits` and the keyboard read are unchanged, and `fixed` moves the foot into gorhom's footer once the content is capped. No unit test holds the wiring: source checks were dropped from the suite (8944ac7), so the native render proves it. Rules text in `plugins/native-ui/guide/rules.md` and `ui-core.md`.
Native unrendered: the phone sheet is not rendered here; its look waits for a native render and the critique.
