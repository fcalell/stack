---
id: 003-156
status: done
sessions: {}
---
# react-ui: a ListRow whose title or meta is a path keeps its end

## Goal
Stead's repo screen lists sensitive paths and the repo list shows paths in titles (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/repos.tsx`; design/07-interface.md "Repos"). At 390 px the row title ends in an ellipsis ("packages/server/src/worker/plugi…", "/tmp/stead-fx-u9/r…"), so the end of the path, which tells one path from the next, is lost. Evidence: System repos critique unit u9, shots `repo-390-dark-c`, `list-390-light` (Stead 948b7ec, stack 5564217).

## Approach
A `ListRow` title and meta truncate at the end. 003-70 and 003-116 keep a file row's path start beside a chip (the `FileRow` part); a plain ListRow title that is a path has no middle-ellipsis or end-keeping form, so the app cannot show the end except by a host element with its own truncation, which is a workaround.

## Acceptance criteria
- [x] A ListRow title or meta given as a path truncates in its middle, keeping the first segment's start and the name's end, at 375 px.
- [x] The ListRow showcase holds a long path at the phone width.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether a prop says the text is a path or the part reads it.

## Decided
No flag and no path-sniffing: a `{ code }` part (003-90) that is a whole title or a whole `meta` part cuts in its middle, keeping the start and the end, through `valueCut` (`@fcalell/ui-core/list-state`, the cut `DefinitionRow` uses). Inline within a sentence or a run title it never middle-cuts. A `meta` code part stands in a span of its own at the `Quoted` tier, so it yields ahead of the plain parts.

## Built
`CodeCut` (`plugins/react-ui/src/ui/lib/code.tsx`, `plugins/native-ui/src/ui/lib/code.tsx`) draws the stem truncating and the tail whole; `ListRow` uses it for a title that is one `Coded`, a first meta part that is one `Coded`, and a later `Coded` part. The `works` part of the ListRow showcase frame holds a path title and a path meta part at the phone width.

Evidence: `behaviour/row-meta.stories.tsx` `CodeRuns` and `CodeRunsTouch` (320 and 360 px, desktop and touch density) assert the stem is clipped, the end is whole and unclipped, and no box passes its row; the `ListRow` state stories pass.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/rows/report.md`).
