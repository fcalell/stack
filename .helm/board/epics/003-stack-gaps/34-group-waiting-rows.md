---
id: 003-34
status: done
sessions: {}
---
# react-ui, native-ui: a Group's waiting setting rows stand at the loaded rows' geometry

## Goal
A `Group`'s loading form (three setting-row skeletons with a switch) misses its loaded rows.
At 375 touch the waiting rows are 72 px against loaded 83 and 104, so the card is 218 against
272 px (−20 %), and the title, description and switch bars sit off the loaded centres (cy 25.5 vs
30, 45.5 vs 63, 35.5 vs 30). At 1440 the heights match, but the switch bar drops 9 px and the
description bar sits 3 px high. Found by the design critique of 004-02 in the QueryBoundary
frame.

## Approach
The waiting setting row draws at the loaded setting row's line boxes and heights, on desktop
and touch; a loaded row whose description wraps is the fixed-count rule's per-row case, so the
waiting row matches a one-line description.

## Acceptance criteria
- [ ] (live) a waiting Group's rows match its loaded one-line rows' heights and line centres at 1440 and 375, light and dark.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Web live at 1440 and 375, light and dark: the waiting setting row is built from the loaded row's boxes, so its height and its label, description and switch centres match the loaded one-line row; the card differs only by a loaded description that wraps (the wrap clause). Open: the phone live criterion on the harness.
