---
id: 003-204
status: review
sessions: {}
---
# react-ui: a Group in a scrolling column keeps the height of its rows

## Goal
Stead's System index is a `Split` list of three `Group`s, each holding a `List` (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/system-index.tsx`, the `entries.map` at lines 148-152; design/07-interface.md "System", the index). At 390 x 800 the list pane is a fixed height that scrolls, and its Groups shrink instead: the first Group is 98 px tall with 111 px of content, the third 235 px with 272, so the Usage row's status line is cut and the Sinks row is gone, which leaves Sinks unreachable from the phone index. At 768 and 1280 the Groups fit. Evidence: Stead System critique (`critique/u8/report.md`, `shots2/idx390-pure.png`), stack at `74a0e3d`, HEAD checked.

## Approach
`Group`'s box is `flex flex-col overflow-hidden` (plugins/react-ui/src/ui/components/group/index.tsx, `BOX`) with no `shrink-0`. A Split's list is `flex flex-col overflow-y-auto` (split/index.tsx, `LIST`), and a flex item with `overflow: hidden` has a zero automatic minimum height, so when the pane is shorter than its Groups, each Group gives up height and clips its rows while the pane never scrolls. The app passes only Groups and a List (`<Group><List items row/></Group>`) and has nothing to set: geometry classes go on host elements only. Nothing at HEAD touches Group's shrink (`git log 74a0e3d..HEAD` holds no such change). Not 003-124 (a Split list's bottom room over a docked foot); not 003-131 (a loading Section's body).

## Acceptance criteria
- [x] A Group standing in a scrolling flex column (a Split's list, a Sheet's body) keeps the height of its rows at every width and density, and the column scrolls.
- [x] A Group in a column that does not scroll is unchanged.
- [ ] The Group or Split showcase holds a list pane shorter than its Groups, and the critique measures each Group's height against its content at 390 x 800.

## Open questions
- [x] Its shape (the Group never shrinking, or the scrolling column's children not shrinking): the stack session decides, and whether Section and other overflow-hidden cards in a column share it.

## Ruled
The Group never shrinks (`shrink-0` on its box). The other option, the column's children not shrinking, would be a rule on every scroller, which cannot see its children. Section has no `overflow-hidden` and is unaffected. The probe found the other block frames that hide their overflow and shrink the same way, and they take the same class: `Code`, `Diff`, `ProseDiff`, `Image` and `Stats` (its card and its waiting card). `Message`'s framed card stands inside its own entry and does not shrink.

## Built
`shrink-0` on the box of `Group`, and on the frame of `Code`, `Diff`, `ProseDiff`, `Image` and `Stats` (react-ui). Native's `flexShrink` default is 0, so native is unchanged. `ui-core.md` (the Group paragraph) states the rule.

Evidence: `behaviour/split.stories.tsx` holds `GroupsKeepTheirRows` (+ Touch): a Split list pane 390 px wide and 420 px tall holds three Groups, a Code, a Diff, a ProseDiff, a system Message with a row, an Image and a Stats. The pane scrolls and every block's `clientHeight` equals its `scrollHeight`. Before the Group change the three Groups measure 0 of 160 px at desktop density and 0 of 240 px at touch. Before the other frames' change the Code, Diff, ProseDiff, Image and Stats measured 0 of 204, 166, 72, 193 and 83 px at desktop, and the Code, Diff, ProseDiff and Stats 0 of 252, 206, 80 and 95 px at touch (the touch Image kept its height). `behaviour/sheet.stories.tsx` holds `GroupsInTheBodyKeepTheirRows` (+ Touch): six Groups in a modal Sheet's body; the body scrolls and no Group is clipped, where before the change the body never overflowed (839 of 839 px). The scoped run passed 308 of 308 (66 files), peak 4194 MiB. `pnpm check` turbo 45/45; the three `verify`s pass.

Limit: `shrink-0` holds on both axes, so a frame that stands as a flex item of a row keeps its width as well. The one such use in the roster is a message's attachment thumbnail (`Image` fit thumb in an attachment row's item), a fixed square that no longer yields width in a row narrower than itself; the Message and MessageInput stories pass.

The critique measures each Group's height against its content at 390 x 800.
