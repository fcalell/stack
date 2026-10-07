---
id: 003-132
status: backlog
sessions: {}
---
# react-ui: a waiting Group stands for the static rows it holds (a Slider, a DefinitionRow)

## Goal
Stead's Usage screen waits as it stands loaded: a window section holds a `Meter` and a reserve `Slider` in one `Group`, and "What yields first" holds four `DefinitionRow`s (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/usage.tsx`, the waiting form at lines 45 to 62 against the loaded sections at 232 to 258 and 282 to 324; design/07-interface.md "Usage"). Waiting, the window section has no room where the Slider stands and "What yields first" draws three rows where four load, so the page changes height when the read lands. Evidence: System critique unit u8, shots `load-usage-1440-light`, `load-usage-390-light` (Stead scratchpad `critique/u8/shots/`, stack at `5564217`).

## Approach
`Group loading` with no List in it draws a fixed `SETTINGS = [0, 1, 2]` of three setting-row skeletons with a switch (plugins/react-ui/src/ui/components/group/index.tsx, `groupWait` in ui-core/src/list-state.ts), whatever static rows it holds, and `DefinitionRow` and `Slider` read no loading state at all (`Meter` has `loading`). So a Group of static rows can wait at three rows of one shape only: not at the count of its rows, not with a Slider's label-over-track height, not as one-line rows without a switch. The app can pass `loading` to a `Meter` alone (Stead does) but has no waiting form to pass for a Slider or a plain fact. 003-34 sets the geometry of those three setting rows; 003-66 stands a Slider in a Group's card, loaded; this is the waiting form for what a Group holds besides a List. Seen at stack `5564217`.

## Acceptance criteria
- [ ] A waiting `Slider` draws its label bar and a track-height bar at the loaded Slider's height, in a Group and alone.
- [ ] A waiting `DefinitionRow` draws the one-line row's label and value bars at the loaded row's height (a switch's box only where the row holds a control).
- [ ] A waiting Group holding static rows draws one waiting form per row it holds, in order, so its height matches the loaded card; a Group with a List is unchanged.
- [ ] The Group showcase holds a waiting Group of a Meter, a Slider and DefinitionRows beside the loaded one, and the critique measures both cards at 1440 and 390.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether each part reads the Group's waiting state and draws its own form, or the Group reads its children as `Section` reads its body.
