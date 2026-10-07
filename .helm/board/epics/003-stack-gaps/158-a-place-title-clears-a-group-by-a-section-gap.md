---
id: 003-158
status: backlog
sessions: {}
---
# react-ui: the gap under a Place's title above a Group matches a Section title's

## Goal
Stead's System place draws the section's title "Repos" (a Place main title) over a list: 33 px between the title's bottom (y 149) and the list (y 182), where a Section title sits 6 px over its Group on the same app's repo screen ("Landings" 846 to 852). Evidence: System repos critique unit u9, shot `list-hover` at 1440 (Stead 948b7ec, stack 5564217; `repos.tsx:84`).

## Approach
The Place body's gap and a Section's title gap are separate tokens; a Group placed directly in a Place's main takes the Place's step, so the same title-over-group reads at two rhythms. The app passes only the title and a Group.

## Acceptance criteria
- [ ] A Group directly under a Place's title stands the same distance under it as under a Section's title, or the difference is a named rule.
- [ ] The Place showcase holds a Group directly under its title and the critique measures it at 1440 and 390.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
