---
id: 003-94
status: review
sessions: {}
---
# react-ui: a Split's list and main start at one top, and the list's wash stays in its column

## Goal
Stead's split screens (Now, Chats, Work board, System; `packages/server/src/app/ui` and `routes/*`) draw the list's first content ~10 px under the head hairline (`SPLIT_LIST` = `w-list py-inside px-page …`) while the main or pane starts ~45 px down (`SPLIT_MAIN`/`SPLIT_PANE` = `p-page`), so the two tops never align. The list's hover/selected row wash also overhangs the column's text edge (`LIST` = `-mx-control-x`), and in a Group (System's places list) it covers the group's border. Screens: Stead's sign-off set (scratchpad `signoff/`): `now-1440-light`, `chats-1440-dark`, `card-1440-light`, `rules-1440-light`.

## Approach
Nothing in the app can set the list's inset: geometry classes go on host elements only and the Split owns both regions. Story 82 kept `SPLIT_LIST`'s `py-inside` deliberately and does not address the main's top; 88 caps the main's width only. The wash overhang is by design for a bare list (`LIST` comment) but lands over a Group's hairline and past the list column's inset in the screens. Seen at stack 4e9c133 (pin f6563f6 draws the same).

## Acceptance criteria
- [x] The first content of the list and of the main/pane share one top inset under the head hairline, at desktop density.
- [x] A selected or hovered row's wash stays inside the list column and inside a Group's border.
- [ ] A showcase Split frame holds a list and a record and the critique judges the tops and the wash.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Decided
Already satisfied at HEAD. `SPLIT_LIST_STACK` gives the list `pt-page`, the same inset as `SPLIT_MAIN` and `SPLIT_PANE` (the story's `py-inside` is story 82's earlier form), so the first content of the list and of the main share one top. A row's wash cannot leave its Group: the Group clips its rows (`overflow-hidden`) and a bare list's bleed (`-mx-control-x`) stays inside the list column's `px-page`. No change to the shape; `SPLIT_MAIN`'s measure is 88's.
Evidence: `behaviour/split.stories.tsx` `TopsAndWash` (list and main headings at one top; every row inside the Group's border).

## Critique
Rework: the list and main tops are equal (y 90); the list's wash is unjudged, since the story's rows draw no hover or selected state.

## Rework
`TopsAndWash` draws the Group's rows as openable, with the second the open record. Its play asserts the selected row is washed and the others clear, that the open rows carry the hover and selected-hover washes (a synthetic pointer sets no `:hover`, so those are read off the classes), and that every row stays inside the Group's border. The story passes.
