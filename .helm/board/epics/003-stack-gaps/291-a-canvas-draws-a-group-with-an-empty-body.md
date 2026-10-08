---
id: 003-291
status: todo
sessions: {}
---
# react-ui: a Canvas draws a group with an empty body

## Goal
A Canvas group holding no present node gets no frame (`groupBoxes` in `canvas/geometry.ts`, and the ELK layout in `canvas/elk.ts`), so it is not drawn. Stead's loop is a group (design/07-interface.md "### A workflow: the canvas"); a loop whose body is empty cannot be seen or chosen, and with 003-191 a group is chosen by its head. Seen at stack `a3ff4ef5`.

## Acceptance criteria
- [ ] A group with no present node draws its frame and head at a size the layout gives an empty body, in its place in the path, and its edges meet it.
- [ ] With `onSelect` its head is a button as any group's (003-191).
- [ ] A Canvas whose groups all hold nodes is unchanged.
- [ ] The Canvas showcase holds an empty group at 375 and 1440 px, measured by the critique.

## Open questions
- [ ] Its shape (the empty body's size, and how ELK places it): the stack session decides; a narrowing goes to the owner before the build.
