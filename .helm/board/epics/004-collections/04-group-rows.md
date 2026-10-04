---
id: 004-04
status: backlog
sessions: {}
---
# react-ui, native-ui: a Group's rows from data draw their own four states

## Goal
A set of rows that comes from data and stands in the group card (a Section's paired devices, a
board column's projects) takes its data, and the Group draws its pending, failed, empty and
loaded forms itself. Today the app maps `ListRow`s into `<Group>` (`showcase/layout/settings.tsx`
devices, `places.tsx` projects per stage), and the Group's only waiting form is three
setting-row skeletons with a switch, the shape of static setting rows rather than of the rows it
will hold.

## Approach
Group takes the data form `List` gains in 004-02 and shares its leaf code: `query` (with
`sentence`) or `items`, plus the same `row` map of `ListRow`'s slots: `title`, `meta`,
`leading`, `trailing`, `status`, `href`, `more`, each `(item) => …`. Group and List stay the
look choice (the card ground or the list ground); no look prop is added. Children stay for
static mixed rows (`DefinitionRow`s, a `Switch` row, one invitation), and its `loading` stays
for a loading Section over static rows.

- **Pending**: skeleton rows at the group row's loaded height, with bars in the slots the `row`
  map declares (a leading disc only if `leading` is declared, a trailing bar only if `trailing`
  is), drawn by `ListRow`'s own markup as in 004-02. In a Section, the Section is busy and its
  count waits, as under a `QueryBoundary`.
- **Failed** (query form): the failed `EmptyState` with `sentence` and Retry, in the Section's
  hairline frame.
- **Empty**: `empty`, an `EmptyState`, in the Section's frame in place of the card.
- **Loaded**: the rows on the group ground, the hairline once between them.

Web (`plugins/react-ui`) and phone (`plugins/native-ui`) take the same props; the roster entry
adds them on both. Needs a query (a project's stages, a user's devices) and `items` (local
state, as the showcase's devices are). Depends on 004-02.

## Acceptance criteria
- [ ] (test) both plugins' `Group` take `query`/`items` + `row` + `sentence` + `empty`, and the roster entry lists them and the `error` and `empty` states.
- [ ] (test) a pending Group whose `row` declares no `leading` draws no avatar disc, on web and phone.
- [ ] (live) the showcase's devices and projects-by-stage pass data, with no `.map(<ListRow/>)` in a Group, and draw all four states under `&query=loading|error`.
