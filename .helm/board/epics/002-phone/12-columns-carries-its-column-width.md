---
id: 002-12
status: backlog
sessions: {}
---
# native-ui: a Columns column carries its own width

## Goal
The native `Columns` at `board` lays its children in a sideways-scrolling row but sets no column width: the frame reads nothing of its children, so a column would carry its width as its own prop, and none does. Each child takes its natural width, so a board's columns are not a column each.

## Approach
Decide in the story how a column says its width: a `Column` part, or a width on the child's own props that the roster already types, so `Columns` still places children with flex alone and reads none. Web's `Columns` lays out with grid and needs no wrapper per child; keep the two platforms' children the same.

## Acceptance criteria
- [ ] A board of native `Columns` shows each child at one column width, scrolling sideways, and the width is a prop of the column, not a read of the child.
- [ ] `pnpm check` passes, and the `b-children` check still finds no `Children` walk in `Columns`.
