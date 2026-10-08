---
id: 003-204
status: backlog
sessions: {}
---
# react-ui: a Group in a scrolling column keeps the height of its rows

## Goal
Stead's System index is a `Split` list of three `Group`s, each holding a `List` (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/system-index.tsx`, the `entries.map` at lines 148-152; design/07-interface.md "System", the index). At 390 x 800 the list pane is a fixed height that scrolls, and its Groups shrink instead: the first Group is 98 px tall with 111 px of content, the third 235 px with 272, so the Usage row's status line is cut and the Sinks row is gone, which leaves Sinks unreachable from the phone index. At 768 and 1280 the Groups fit. Evidence: Stead System critique (`critique/u8/report.md`, `shots2/idx390-pure.png`), stack at `74a0e3d`, HEAD checked.

## Approach
`Group`'s box is `flex flex-col overflow-hidden` (plugins/react-ui/src/ui/components/group/index.tsx, `BOX`) with no `shrink-0`. A Split's list is `flex flex-col overflow-y-auto` (split/index.tsx, `LIST`), and a flex item with `overflow: hidden` has a zero automatic minimum height, so when the pane is shorter than its Groups, each Group gives up height and clips its rows while the pane never scrolls. The app passes only Groups and a List (`<Group><List items row/></Group>`) and has nothing to set: geometry classes go on host elements only. Nothing at HEAD touches Group's shrink (`git log 74a0e3d..HEAD` holds no such change). Not 003-124 (a Split list's bottom room over a docked foot); not 003-131 (a loading Section's body).

## Acceptance criteria
- [ ] A Group standing in a scrolling flex column (a Split's list, a Sheet's body) keeps the height of its rows at every width and density, and the column scrolls.
- [ ] A Group in a column that does not scroll is unchanged.
- [ ] The Group or Split showcase holds a list pane shorter than its Groups, and the critique measures each Group's height against its content at 390 x 800.

## Open questions
- [ ] Its shape (the Group never shrinking, or the scrolling column's children not shrinking): the stack session decides, and whether Section and other overflow-hidden cards in a column share it.
