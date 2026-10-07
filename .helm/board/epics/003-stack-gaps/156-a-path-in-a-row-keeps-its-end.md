---
id: 003-156
status: backlog
sessions: {}
---
# react-ui: a ListRow whose title or meta is a path keeps its end

## Goal
Stead's repo screen lists sensitive paths and the repo list shows paths in titles (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/repos.tsx`; design/07-interface.md "Repos"). At 390 px the row title ends in an ellipsis ("packages/server/src/worker/plugi…", "/tmp/stead-fx-u9/r…"), so the end of the path, which tells one path from the next, is lost. Evidence: System repos critique unit u9, shots `repo-390-dark-c`, `list-390-light` (Stead 948b7ec, stack 5564217).

## Approach
A `ListRow` title and meta truncate at the end. 003-70 and 003-116 keep a file row's path start beside a chip (the `FileRow` part); a plain ListRow title that is a path has no middle-ellipsis or end-keeping form, so the app cannot show the end except by a host element with its own truncation, which is a workaround.

## Acceptance criteria
- [ ] A ListRow title or meta given as a path truncates in its middle, keeping the first segment's start and the name's end, at 375 px.
- [ ] The ListRow showcase holds a long path at the phone width.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether a prop says the text is a path or the part reads it.
