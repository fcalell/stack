---
id: 003-138
status: backlog
sessions: {}
---
# react-ui: a Section nested in a Section reads a level below its parent

## Goal
Stead's Memory place with nothing yet draws "Memory" as a Section title over "Stead" and "Code" Sections inside it, all at the same weight and size (22/600 measured at 320), with 64 px of blank under the first title, so the hierarchy reads as three equal headings (`packages/server/src/app/routes/system/`, Memory). Evidence: Now critique unit u1, shot `first-memory-320-*` (Stead scratchpad `critique/u1/shots/`, stack at `5564217`).

## Approach
Nothing in the app separates them: both are `Section` titles, drawn by the same `heading` role whatever the nesting. 003-106 is `ItemHeader` against a `Section` title and does not cover one Section inside another. Nothing in stack gives a nested Section a lower role.

## Acceptance criteria
- [ ] A Section inside a Section draws its title a clear level below its parent's, in light and dark at touch and desktop.
- [ ] The Section showcase holds a nested pair and the critique judges it.

## Open questions
- [ ] Its shape (a nested role, a prop, a variant): the stack session decides.
