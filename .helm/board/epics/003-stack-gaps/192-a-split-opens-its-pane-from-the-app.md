---
id: 003-192
status: backlog
sessions: {}
---
# react-ui: a Split opens its pane from the app below wide

## Goal
design/07-interface.md "### A workflow: the canvas", Interactions: "A tap on a node selects it and opens its sheet", the sheet standing in the pane from `wide` and as a side sheet below it. Stead (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/canvas.tsx:406` selects on `onSelect` and `:444-451` hands the node's sheet to `Split` as `pane`) selects on a tap at every width, but below `wide` the pane opens only from the Details act the Place draws. It costs Stead a second step on the phone and a tablet: tap a node, then find Details, where the spec opens the sheet at the tap.

## Approach
`SplitProps` (`plugin-react-ui/src/ui/components/split/index.tsx:69-82`) has `list`, `main`, `beside`, `pane`, `empty` and `back`. The sheet's open state is `useState(false)` inside `Split` (`:101`), set only through `SheetBase`'s `onOpen` from the Details act (`:186-188`); `pane` below `wide` is `page-max-wide:hidden` (`PANE`, `:61`) and nothing opens the sheet from outside. Things tried:
- Keying the `pane` or the `Split` on the selection remounts the Split and resets the open state to closed; it does not open it.
- Rendering the node sheet as an app-owned `Sheet` below `wide` and as the `pane` above it duplicates the sheet and the width test the Split already makes, and loses the Details act's handle (`DetailsSheet` in `lib/frame.ts`, not exported to apps).
- Stead cannot click the Details act programmatically without a host query on the roster's DOM.

## Acceptance criteria
- [ ] A Split can be told to open its pane: below `wide` the pane stands as its side sheet when the app asks, and closing it (its close act, Escape, the scrim) is heard by the app, so the app's selection can clear; from `wide` the pane stands beside the main as today.
- [ ] The Details act stands and works as today, and agrees with the app's state.
- [ ] A Split that never asks is unchanged.
- [ ] The Split showcase holds a pane opened by the app below `wide` (375 and 768 px) and its close, measured by the critique.

## Open questions
- [ ] Its shape (`open` and `onClose` props, a handle the app holds, or the pane opening whenever it changes from `undefined`): the stack session decides.
