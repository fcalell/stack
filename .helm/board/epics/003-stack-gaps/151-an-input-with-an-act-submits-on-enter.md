---
id: 003-151
status: review
sessions: {}
---
# react-ui: an Input with an act submits on Enter

## Goal
Stead's Rules page adds a read host through `Input kind="source"` with `act={{ icon: "Plus", label: "Add", onAct }}` (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/add-field.tsx`; design/07-interface.md "Rules"). System critique unit u8 (Stead `948b7ec`, shot `s7`): Enter in the field adds nothing (value kept, no request); only the Add act adds.

Evidence, Stead repo screens critique unit u9 (Stead 948b7ec, stack 5564217; shots in Stead scratchpad critique/u9/shots/), `add-field.tsx:30` (Add a path): typing a path and pressing Enter keeps the value and adds nothing; only the Plus act adds. Measured.

## Approach
`Input` (plugin-react-ui `input/index.tsx`) hears Enter through `onCommit` alone ("on leaving the field or on Enter, only when it changed since focus"), and the in-field `act` is a separate button. An app cannot hang the add on `onCommit`, which also fires on blur and would add a half-typed host when the viewer tabs away; a wrapping `Form` with `onSubmit` adds a field shape the page does not need. No `act` option says it also answers Enter.

## Acceptance criteria
- [x] An Input with an `act` presses that act on Enter (and not on blur), on every platform the app runs on.
- [x] `Behaviour/Input` holds an add field whose Enter and act do the same, leaving the field pressing nothing. A disabled field takes no key, so there is no Enter to ignore.

## Open questions
- [x] Its shape: `act` implies Enter, no option (derive over configure; no ruling contradicts).

## Built
react-ui `input/index.tsx`: the Input's key handler runs the commit moment, then on Enter with an `act` prevents the native submit and calls `act.onAct()`. native-ui `input/index.tsx`: `onSubmitEditing` commits, then calls `act?.onAct()`. The `act` JSDoc and both `rules.md` pages say so. Evidence: `Behaviour/Input` ActOnEnter passes (tab away presses nothing, Enter once, the act's click once more).
