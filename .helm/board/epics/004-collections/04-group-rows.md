---
id: 004-04
status: review
sessions: {}
---
# react-ui, native-ui: a List inside a Group draws its rows on the card

## Goal
A set of rows that comes from data and stands in the group card (a Section's paired devices, a
board column's projects) draws its pending, failed, empty and loaded forms itself. Today the app
maps `ListRow`s into `<Group>` (`showcase/layout/settings.tsx` devices, `places.tsx` projects
per stage), and the Group's only waiting form is setting-row skeletons, the shape of static
setting rows rather than of the rows it will hold.

## Approach
Decided by fcalell (2026-10-04): `Group` stays composition and takes children only (static
mixed rows: `DefinitionRow`s, a `Switch` row, one invitation). A set of rows from data is a
`List` (004-02's data form) placed in a `Group`: the List reads the Group's context and draws its
rows, its waiting rows and its failed and empty forms on the card ground, the hairline once
between rows. No look prop and no second Group form.

- **Pending**: 004-02's waiting rows at the group row's loaded height.
- **Failed** and **Empty**: the List's own forms, in the card's frame.
- **Loaded**: the rows on the group ground.

Web (`plugins/react-ui`) and phone (`plugins/native-ui`) alike. Depends on 004-02.

## Acceptance criteria
- [x] (test) a `List` in a `Group` draws group rows; the same List outside draws list rows.
- [ ] (live) the showcase's devices and projects-by-stage pass data through a `List` in a `Group`, with no `.map(<ListRow/>)`, and draw all four states under `&query=loading|error`.

## Progress
Built on web and phone; `pnpm check` passes. The web live criterion passed in the showcase (devices and projects-by-stage, all four states). Open: the phone live check on the harness.
