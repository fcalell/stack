---
id: 003-131
status: backlog
sessions: {}
---
# react-ui: a loading Section with a Prose or Thread body stands for that body, not for form fields

## Goal
Stead's story card waits as it stands loaded: a Brief section holding a `Prose`, a Thread section holding a `Thread`, each in a `Section loading` with the part's own `loading` set (github.com/fcalell/stead, `packages/server/src/app/routes/work/-components/card.tsx`, `CardWaiting`; design/07-interface.md "The card", a loading screen keeps its loaded height). Waiting, the Brief section is 345 px at 1280 where the loaded Brief is about 150 px, and the Thread section draws the same three label-and-block groups where messages will stand, so the card changes height and shape when the read lands. Evidence: card critique unit u7, shots `load-card-1280-light`, `load-job-1280-light`, `run-1280-light` (Stead scratchpad `critique/u7/shots/`, stack at `5564217`).

## Approach
A loading `Section` decides how its body waits from the direct children it knows (`sectionPartsOf` with `KINDS` in plugins/react-ui/src/ui/components/section/index.tsx: List, Table, BarChart, Comparison, QueryBoundary, Group, FormField). A body holding none of them counts as a body of fields: `sectionState` (ui-core/src/list-state.ts) returns `parts.fields || FALLBACK_FIELDS`, so the Section draws three skeleton fields (a label bar over a 59 px block) and hides the real body (`BODY_WAITS = "hidden"`), whatever its children's own `loading` would draw. `Prose` and `Thread` have their own waiting forms (`Prose loading`, `Thread loading`), but they never show inside a loading Section, and the app cannot reach the Section's choice from outside. Not 003-123 (how many lines a waiting `Prose` stands for): that one is the part's own form, which this Section hides. Not 003-127 (the description line). Seen at stack `5564217`.

## Acceptance criteria
- [ ] A loading Section whose body is a `Prose`, a `Thread` or a `Code` draws that part's own waiting form, not skeleton fields.
- [ ] A loading Section holding fields, a Group or a List is unchanged.
- [ ] The Section showcase holds a loading Section over a Prose and one over a Thread beside the loaded ones, and the critique measures both heights.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the Section reads more kinds as waiting parts, shows its body whenever a child declares its own `loading`, or takes the fallback only for a body that holds no part with a waiting form.
