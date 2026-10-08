---
id: 003-177
status: done
sessions: {}
---
# react-ui: the loading Section frame's Members group waits as the rows it stands for

## Goal
In `layout-section--loading` the Members Group waited as 64 px setting rows (3 rows, 195 px) against the 32 px one-line rows it stands for (97 px, critique `section/report.md`, pre-existing). The frame drew the Group's rows as static `StandInRows`, which no part answers for, so `groupWait` fell back to the three setting rows by design.

## Approach
Rows whose shape is known are a `List`: its waiting rows follow its row map. The frame draws the Members Group as `StandInList`; static children keep the setting-row fallback, which `Group`'s `loading` doc states and `Behaviour/Waiting` `GroupOfOwnRows` holds.

## Acceptance criteria
- [x] The loading Section frame's Members group waits at the loaded rows' height.

## Built
`plugins/react-ui/src/ui/showcase/frames/section.tsx`: the loading cell's Members Group holds `<StandInList />`. Evidence: `layout/Section` Loading story in the browser run.

## Critique (second round)
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/r2-components/report.md`).
