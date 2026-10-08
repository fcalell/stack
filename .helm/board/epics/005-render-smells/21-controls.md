---
id: 005-21
status: review
sessions: {}
---
# react-ui, native-ui: Picker, Select, Slider and MessageInput keep per-render work out

## Goal
- Web `PickSheet` roves its tab stop through React state: every option's `onFocus` sets
  `focused` (`components/picker/base.tsx:699`, stop at `:632-634`), so each arrow key re-renders
  the sheet and every row, though the DOM already holds the focus.
- Phone `PickSheet` groups, flattens and filters its options on every render, open or closed
  (`picker/sheet.tsx:149-159`), and `PickerBase` and `Select` repeat it for the trigger
  (`picker/base.tsx:63-65`, `select/index.tsx:42-43`): a table of cell pickers pays it each render.
- Web `Select` re-implements `spacing('pair')` as `pairOffset()`, reading `getComputedStyle` on
  every reposition (`select/index.tsx:64-70`, `:132`); Menu uses the helper.
- Phone `Slider` keeps its width in state it never renders (`slider/index.tsx:53`, `:132`), one
  extra render per layout.
- Phone `MessageInput` gives each chip an inline `ref` callback (`message-input/index.tsx:139-142`),
  so every keystroke detaches and reattaches every chip ref.

## Approach
The roving stop moves in the DOM, with state only for the first stop. Option groups derive once
per options identity, shared by trigger and sheet, and the filter runs only while open. Select
uses `() => spacing('pair')`. The Slider's width is a ref beside `latest`. Each chip registers
through a stable per-id ref.

## Acceptance criteria
- [ ] (live) web, members' role Select on touch at 375: an arrow key re-renders no option it did not move between (React profiler).
- [ ] (live) phone, on the harness: typing in a MessageInput with chips re-renders no chip.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Web live at 375 touch on a four-option pick sheet: arrow, End and Home keys each commit nothing and render no option (master: one commit, four options), and the tab stop moves correctly. Open: the phone live criterion on the harness.

## Critique
Unrendered: its criteria show only in the React profiler or on the phone harness; the Select trigger and options render unchanged.
