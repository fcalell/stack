---
id: 003-210
status: backlog
sessions: {}
---
# react-ui: a field that opens for editing takes the focus

## Goal
Stead's knowledge page swaps its rendered text for a source `TextArea` when the operator presses "Edit" (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/edit-text.tsx`, `EditText`; `knowledge.tsx`, the page's Edit act). The Edit act unmounts as the field mounts, so focus falls to the document body and the next Tab lands on the top bar's More: a keyboard operator who pressed Edit must find the field again. Evidence: Stead's knowledge editor critique unit u10 at stack `74a0e3d` (`document.activeElement` is BODY after Edit; Stead scratchpad `critique/u10/shots4/edit-1440-light.png`).

## Approach
`TextArea` (`components/text-area/index.tsx`) takes `kind`, `value`, `onChange`, `onCommit`, `placeholder` and `budget`: no `autoFocus`, no ref. `Input` focuses itself only inside its cell and inline contexts (`autoFocus={cell?.starts || inline?.focus}`), and `FormField` focuses only an answered field that unfolds. The app's one way left is a DOM query and `.focus()` at the call site, a local reach into the roster's markup. Unchanged at stack `HEAD` past `74a0e3d`.

## Acceptance criteria
- [ ] A `TextArea` (and an `Input`) the app opens for editing in place of what it shows takes the focus when it mounts, with the caret at the text's end, on both platforms.
- [ ] A field on a form that loads with the page does not take the focus.
- [ ] The showcase holds an edit-in-place swap whose field takes the focus, checked by a behaviour story.

## Open questions
- [ ] Its shape (an `autoFocus` prop, a field that focuses when its region swaps it in, or another): the stack session decides.
