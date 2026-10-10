---
id: 003-210
status: review
sessions: {}
---
# react-ui: a field that opens for editing takes the focus

## Goal
Stead's knowledge page swaps its rendered text for a source `TextArea` when the operator presses "Edit" (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/edit-text.tsx`, `EditText`; `knowledge.tsx`, the page's Edit act). The Edit act unmounts as the field mounts, so focus falls to the document body and the next Tab lands on the top bar's More: a keyboard operator who pressed Edit must find the field again. Evidence: Stead's knowledge editor critique unit u10 at stack `74a0e3d` (`document.activeElement` is BODY after Edit; Stead scratchpad `critique/u10/shots4/edit-1440-light.png`).

## Approach
`TextArea` (`components/text-area/index.tsx`) takes `kind`, `value`, `onChange`, `onCommit`, `placeholder` and `budget`: no `autoFocus`, no ref. `Input` focuses itself only inside its cell and inline contexts (`autoFocus={cell?.starts || inline?.focus}`), and `FormField` focuses only an answered field that unfolds. The app's one way left is a DOM query and `.focus()` at the call site, a local reach into the roster's markup. Unchanged at stack `HEAD` past `74a0e3d`.

## Acceptance criteria
- [ ] A `TextArea` (and an `Input`) the app opens for editing in place of what it shows takes the focus when it mounts, with the caret at the text's end, on both platforms.
- [x] A field on a form that loads with the page does not take the focus.
- [x] The showcase holds an edit-in-place swap whose field takes the focus, checked by a behaviour story.

## Open questions
- [x] Its shape (an `autoFocus` prop, a field that focuses when its region swaps it in, or another): the stack session decides.

## Ruled
`autoFocus?: boolean` on `Input` and `TextArea` (both platforms), off by default: nothing a field knows tells an edit swap from a page load, so the app says it. The caret ends the text.

## Built
react-ui: `autoFocus` goes to the element (React focuses on mount) and a stable ref (`lib/caret.ts`, `caretAtEnd`) sets the selection to the text's end once on mount, skipping a type with no selection (`email`); `Input` keeps its cell and inline sources (`autoFocus ?? (cell?.starts || inline?.focus)`). native-ui: `autoFocus` on the `TextInput` and `selection` at the end for the first render only (`lib/caret.ts`, `useCaretAtEnd`). The roster entries, both `rules.md` and `ui-core.md` state it.
Evidence: `apps/showcase/behaviour/text-area.stories.tsx` (`AutoFocusTakesTheFocusAtTheEnd`: after the Edit act the field is `document.activeElement`, the caret at the end, and typing mid-text keeps the caret; `LoadedFieldKeepsTheFocus`) and `input.stories.tsx` (the same two) pass. The native side is checked by type-check and `verify` only (no native run exists in the repo).
Native unrendered: field takes focus with caret at end, on both platforms.

## Review
Web accepted 2026-10-10; waits on the native render. The first box names both platforms and stays open; the web edit-in-place swap is ticked. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass.
