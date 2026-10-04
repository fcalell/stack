---
id: 004-02
status: backlog
sessions: {}
---
# react-ui, native-ui: a List takes its items and a row map, and its skeleton draws the declared slots

## Goal
A `List`'s loading rows match its loaded rows. A consumer's notes list (title and meta, no
`leading`) waits on two-line rows with an avatar disc, so when the data lands the text moves left
by the avatar's width plus the gap, at 1440 and 375 px with the list request held. Filed as a
gap by that consumer; this story sets the collection pattern the epic follows.

## Approach
Family 4 in `.helm/research/skeleton-loading.md`: the shape is declared as data, once, as the
projection itself.

- `List` takes `query` or `items`, plus `row`: per-slot accessors `(item: T) => …` over
  `ListRow`'s props. The skeleton reads which keys `row` has; accessors run only on real items.
  `query` | `items` + `row` is the only form: a static list (`shell/index.tsx`, the showcase's
  `frames/shell.tsx`, `frames/split.tsx`, `layout/deploys.tsx`) passes `items`.
- The waiting row is `ListRow`'s own markup with bars in the declared slots, so the loaded and
  waiting forms share one source. `BARS`, `TRAILING_BARS` and the `LoadingRow` context go.
- With `query`, the `List` draws all four states at the leaf: pending in its skeleton, failed
  with `sentence` and Retry, empty as `empty` (an `EmptyState`, as `Table` takes it), loaded.
  With `items`, `loading` says it waits.
- `Table`'s touch path passes its rows as `items` with a row map that declares `trailing`, in
  place of `LoadingRow value="two-line-trailing"`.
- The rubric gains the rule that makes a declared slot exact: within one list, every row has a
  `leading` or none does. A slot whose accessor may return `undefined` is drawn in skeleton.
- Web and phone in one change; `native-ui`'s `List` carries the same `LoadingRow` twin.

## Acceptance criteria
- [ ] (test) a `List` whose `row` has no `leading` waits on rows with no leading slot, with and without `meta`; one with `leading` waits on rows with it; one with `trailing` waits on rows with its bar. Both platforms.
- [ ] (test) with `query`: pending draws the skeleton without running an accessor, an error draws the failed `EmptyState` with `sentence` and a Retry that refetches, no items draws `empty`.
- [ ] (file) `LoadingRow`, `BARS` and `TRAILING_BARS` are gone from both platforms; `Table`'s touch path uses the row map.
- [ ] (file) `packages/ui-core/guide/rubric.md` states the one-leading-per-list rule.
- [ ] (render) the showcase list frame, a title-and-meta list with no `leading`, at 1440 and 375 px: the text's left edge and the row heights hold when the data lands.

## Open questions
- [ ] Each item's React key: a `key` accessor in `row` (recommended, `T` stays free) or a required `id` on `T`.
