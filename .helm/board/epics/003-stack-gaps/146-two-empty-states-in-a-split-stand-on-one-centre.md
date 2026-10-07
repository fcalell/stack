---
id: 003-146
status: backlog
sessions: {}
---
# react-ui: the list's empty state and the Split's main empty state share a centre

## Goal
Stead's empty repo draws two empty states side by side at 1440 px: "No stories yet" in the list (centre y 535) and "No story open" in the main (centre y 525), 10 px apart, both competing as the screen's focal points (github.com/fcalell/stead, `packages/server/src/app/routes/work/route.tsx`; design/07-interface.md "Work" prescribes both forms). Evidence: critique unit u6, shot `empty-repo-1440-light` (Stead scratchpad `critique/u6/shots/`, stack at `5564217`).

## Approach
Split centres its `empty` main by `EMPTY = "flex grow min-w-0 items-center justify-center"` in the region below the head (split/index.tsx) while the list's EmptyState centres in a column with a toolbar over it, so the two centres differ by the toolbar's height. The app passes both as content and cannot align them. Not 003-119 (the section's one quiet sentence). Seen at stack `5564217`.

## Acceptance criteria
- [ ] With a list and a main both empty, the two empty states stand on one vertical centre, or the main's is quieter than the list's.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
