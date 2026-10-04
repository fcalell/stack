---
id: 003-32
status: backlog
sessions: {}
---
# react-ui: a waiting Diff stands at its loaded height

## Goal
On `/layout?place=deploys&record=d1`, the Diff under the file list waits at 168 px and lands at
258 px, so the Build log section below moves 90 px. Found by the design critique of 004-02.

## Approach
The Diff's waiting form takes the loaded form's height, or the fixed-count rule for content of
unknown length applies and is recorded as such.

## Acceptance criteria
- [ ] (live) nothing below the Diff moves when its data lands, or the critique records the rule that covers it.
