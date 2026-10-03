---
id: 003-02
status: backlog
sessions: {}
---
# react-ui: a List's loading rows always draw an avatar, so rows with no leading jump on load

## Goal
screen.md step 5: "Loading draws each region's loaded form in skeleton … so nothing moves when
the data lands." The notes list (`src/app/routes/index.tsx`) is a `List` of `ListRow`s with a
title and a meta line and no `leading`. Its `QueryBoundary` loading form (`List loading`) draws
two-line skeleton rows with an avatar disc, so when the data lands the text moves left by the
avatar's width plus the gap. This holds at desktop and at touch (screenshots taken at 1440 and
375 px, with the list request held).

## Approach
`List` takes only `loading`. Its skeleton shape comes from the internal `LoadingRow` context
(`"two-line"` with an avatar, or `"two-line-trailing"`, which only `Table` sets). No prop or
`QueryBoundary` option draws rows without the leading slot. Giving every note a decorative
`leading` icon to match the skeleton would bend the design to the placeholder.

## Acceptance criteria
- [ ] A `List` (or `QueryBoundary`) can draw skeleton rows matching rows with no leading, with or without a meta line.

## Open questions
- [ ] Infer it from the children's shape, or a prop: the stack session decides.
