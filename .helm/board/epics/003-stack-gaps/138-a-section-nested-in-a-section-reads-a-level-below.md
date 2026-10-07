---
id: 003-138
status: review
sessions: {}
---
# react-ui: a Section nested in a Section reads a level below its parent

## Goal
Stead's Memory place with nothing yet draws "Memory" as a Section title over "Stead" and "Code" Sections inside it, all at the same weight and size (22/600 measured at 320), with 64 px of blank under the first title, so the hierarchy reads as three equal headings (`packages/server/src/app/routes/system/`, Memory). Evidence: Now critique unit u1, shot `first-memory-320-*` (Stead scratchpad `critique/u1/shots/`, stack at `5564217`).

## Approach
Nothing in the app separates them: both are `Section` titles, drawn by the same `heading` role whatever the nesting. 003-106 is `ItemHeader` against a `Section` title and does not cover one Section inside another. Nothing in stack gives a nested Section a lower role.

## Acceptance criteria
- [x] A Section inside a Section draws its title a clear level below its parent's, in light and dark at touch and desktop.
- [ ] The Section showcase holds a nested pair and the critique judges it (the pair stands in the frame; the critique is another session's).

## Open questions
- [x] Its shape (a nested role, a prop, a variant): the stack session decides.

## Built
A Section read inside another Section (`SectionContext`, no prop) draws its title at `SECTION_NESTED_TITLE` (new cell: body size and line, weight 600, `ink-body`) in both plugins; a top-level Section keeps the `heading` role. The screen draws no new size. The Section frame holds a "Memory" Section over "Workspace" and "Code" Sections.
Measured at 1200 (desktop): the outer title draws 15/600, the inner 13/600.
Evidence: `stories/Section.stories.ts` passes; `ui-core`, `plugin-react-ui` and `plugin-native-ui` verify pass. The 64 px of blank under the first title in the story's evidence is the Place body's rhythm and is not changed here.
