---
id: 004-08
status: review
sessions: {}
---
# react-ui, native-ui: a list of changed files from data draws its own four states

## Goal
A deploy's changed files are a `List` of `FileRow`s mapped over data
(`showcase/layout/changes.tsx` `Files`), and their loading form is a hand-drawn twin
(`FilesWaiting`: a count of `FileRow loading` stand-ins). The list has no failed or empty form
of its own.

## Approach
List's data form (004-02) takes a `file` map in place of `row`, over `FileRow`'s slots: `path`,
`added`, `removed`, `seen`, `href`, `onOpen`, each `(item) => …`. One List holds one row kind,
so a List takes `row` or `file`, never both.

- **Pending**: `FileRow`'s own loading rows (the glyph, the path's bar, the counts' bar); the
  twin goes.
- **Failed** (query form): the failed `EmptyState` with `sentence` and Retry.
- **Empty**: `empty`, an `EmptyState` (no files changed).
- **Loaded**: the rows, the open file's row selected at its `href`.

Web and phone take the same props. Needs a query (a deploy's or a review's changes) and `items`
(the same list beside a diff from one query). Depends on 004-02.

## Acceptance criteria
- [x] (test) both plugins' `List` take `file` as an item map, and a List given `row` and `file` together fails the type-check.
- [ ] (live) the changes page passes its files as data, `FilesWaiting` is gone, and the list draws its four states under `&query=loading|error`.

## Progress
The file map, its four states and the changes page shipped with 004-02; the type-level tests are added. Open: the live criteria (web per batch, phone on the harness).
