---
id: 003-127
status: backlog
sessions: {}
---
# react-ui: a loading Section stands for the description line it will have

## Goal
Stead's review screen waits as the loaded one stands, and its Check, Criteria and Sensitive changes Sections carry a description once loaded ("Passed on 6dbf0da", the criteria tally, "x of y" seen) (github.com/fcalell/stead, `packages/server/src/app/ui/review.tsx`, `Waiting` against the loaded Sections; design/07-interface.md "Items", a loading screen keeps its loaded height). Waiting, the Section draws no description line, so the Check Code block starts 22 px higher at 390 than it does loaded and the page shifts as the read lands. Evidence: item screens critique unit u4, shot `e-load-390-light` (Stead scratchpad `critique/u4/shots/`, stack at `5564217`).

## Approach
`Section`'s `description` is drawn as `<Text role="meta">` when it is set (plugins/react-ui/src/ui/components/section/index.tsx), whatever `loading` says; `loading` makes the count and the body wait and nothing else. The app does not know the sentence before the read lands, and passing a stand-in sentence ("Passed on 0000000") would draw invented text where a bar belongs and hold a real string in the accessibility tree. 003-34 (a Group's waiting rows) and 003-123 (a waiting Prose) set the same rule for those parts: a waiting form stands at the loaded geometry; `Section` has no such cell for its description. Seen at stack `5564217`.

## Acceptance criteria
- [ ] A loading Section can stand for a description line: one meta-height line bar in the description's place, so the head keeps its loaded height.
- [ ] A loading Section that asks for none is unchanged.
- [ ] The Section showcase holds a loading form with the description line beside the loaded one and the critique measures both heads.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether `description` takes a waiting marker, a `loading` Section with a `description` draws the bar and keeps the text for the readers, or a separate prop.
